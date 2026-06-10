import { NextRequest } from 'next/server';
import { UserRepository, ConversationRepository, MessageRepository } from '@/lib/repository';
import { MemoryService } from '@/lib/memoryService';
import { generateTextStream } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message content is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await UserRepository.getOrCreateDefaultUser();
    let convId = conversationId;

    // Create a new conversation if not provided
    if (!convId) {
      // Determine a title based on the first message (shortened)
      const title = message.length > 30 ? message.slice(0, 30) + '...' : message;
      const conversation = await ConversationRepository.create(user.id, title);
      convId = conversation.id;
    }

    // 1. Retrieve semantic memory context for the prompt
    const memoryContext = await MemoryService.retrieveMemoryContext(user.id, message, 5);

    // 2. Fetch conversation history
    const historyDocs = await MessageRepository.listByConversation(convId);
    
    // Map to Gemini chat history format
    const historyParts = historyDocs.map(m => ({
      role: (m.role === 'user' ? 'user' as const : 'model' as const),
      parts: [{ text: m.content }]
    }));

    // 3. Assemble Custom System prompt containing retrieved memories
    const systemInstruction = `
      You are Memoria AI, a highly intelligent and proactive Personal Chief of Staff AI Agent.
      You help the user achieve their long-term goals, manage tasks, and reflect on their progress.

      ${memoryContext}

      COGNITIVE GUIDELINES:
      - Always acknowledge and leverage the retrieved memories, preferences, and goals naturally. NEVER say "Based on my database" or "I retrieved a memory". Speak as if you naturally remember these facts (e.g., "Since you prefer TypeScript...", "How is the enterprise agent startup coming along?").
      - If the user asks a question where memory provides context, prioritize that context.
      - Be structured, concise, and professional, yet supportive (like an executive chief of staff).
      - If you identify new tasks or goals from this message, let the user know you'll record them.
    `;

    // 4. Create response stream
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        try {
          const stream = generateTextStream(message, historyParts, systemInstruction);
          
          // Stream the text to client
          for await (const chunk of stream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // Trigger background DB writes and memory extraction (do not block the response stream)
          (async () => {
            try {
              // Save User message
              const userMsg = await MessageRepository.create(convId, 'user', message);
              // Save Assistant message
              const assistantMsg = await MessageRepository.create(convId, 'assistant', fullResponse);
              
              // Automatically extract and store new memories
              await MemoryService.extractAndStoreMemories(
                user.id,
                message,
                fullResponse,
                convId,
                assistantMsg.id
              );
            } catch (err) {
              console.error('[Background Processing Error]:', err);
            }
          })();

        } catch (err) {
          console.error('[Streaming API Error]:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Conversation-Id': convId, // Pass the conversation ID back to the client via headers
      }
    });

  } catch (err) {
    console.error('API Error in /api/chat:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
