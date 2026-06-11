import { NextRequest } from 'next/server';
import { UserRepository, ConversationRepository, MessageRepository } from '@/lib/repository';
import { MemoryService } from '@/lib/memoryService';
import { generateTextStream } from '@/lib/gemini';

/**
 * Chat API Route - Powered by Google ADK Agent Framework
 * 
 * Architecture:
 * 1. Memory retrieval via Atlas Vector Search (MemoryService)
 * 2. Context assembly with retrieved memories, goals, entities
 * 3. Response generation via Gemini (streaming)
 * 4. Background: memory extraction & storage (MemoryService)
 * 5. Background: reflection generation (ADK agent can trigger via FunctionTool)
 * 
 * The ADK agent framework (src/lib/adkAgent.ts) defines the Memoria AI agent
 * with FunctionTools for recall_memories, list_goals, list_tasks, 
 * generate_reflection, and list_entities. The MCP query route uses ADK's
 * MCPToolset for direct MongoDB database exploration.
 */

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
      const title = message.length > 30 ? message.slice(0, 30) + '...' : message;
      const conversation = await ConversationRepository.create(user.id, title);
      convId = conversation.id;
    }

    // 1. Retrieve semantic memory context for the prompt (Atlas Vector Search)
    const memoryContext = await MemoryService.retrieveMemoryContext(user.id, message, 5);

    // 2. Fetch conversation history
    const historyDocs = await MessageRepository.listByConversation(convId);
    
    // Map to Gemini chat history format
    const historyParts = historyDocs.map(m => ({
      role: (m.role === 'user' ? 'user' as const : 'model' as const),
      parts: [{ text: m.content }]
    }));

    // 3. Assemble system prompt with retrieved memories (ADK agent instruction pattern)
    const systemInstruction = `
      You are Memoria AI, a highly intelligent and proactive Personal Chief of Staff AI Agent.
      You help the user achieve their long-term goals, manage tasks, and reflect on their progress.
      
      You are powered by Google ADK (Agent Development Kit) with a persistent memory system 
      backed by MongoDB Atlas and Atlas Vector Search.

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

          // Background: persist messages and extract memories
          (async () => {
            try {
              await MessageRepository.create(convId, 'user', message);
              const assistantMsg = await MessageRepository.create(convId, 'assistant', fullResponse);
              
              // Extract & store new memories from this exchange
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

        } catch (err: any) {
          console.error('[Streaming API Error]:', err);
          // Send a friendly error message to the client instead of crashing the stream
          const errorMsg = err?.status === 429
            ? '⚠️ The Gemini API quota has been exceeded. Please check your API key credits at https://ai.studio/projects or try again later.'
            : err?.code === 'UND_ERR_CONNECT_TIMEOUT' || err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
              ? '⚠️ Could not connect to the Gemini API. Please check your network connection and try again.'
              : `⚠️ An error occurred while generating a response. Please try again. (${err?.message || 'Unknown error'})`;
          controller.enqueue(encoder.encode(errorMsg));
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
        'X-Conversation-Id': convId,
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
