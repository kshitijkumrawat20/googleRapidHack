import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/adkAgent';
import { UserRepository } from '@/lib/repository';

/**
 * ADK Agent API Route
 * 
 * This route demonstrates the Google ADK (Agent Development Kit) framework
 * integration. It runs the Memoria AI agent through the ADK Runner, which
 * orchestrates FunctionTool calls (recall_memories, list_goals, etc.)
 * via the Gemini model.
 * 
 * This is a non-streaming endpoint that returns the full agent response
 * along with metadata about which tools were called.
 */

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const user = await UserRepository.getOrCreateDefaultUser();
    console.log(`[ADK Agent] Running agent for user ${user.id}: "${message}"`);

    const { responseText, events } = await runAgent(
      user.id,
      'ephemeral',
      message
    );

    // Extract tool usage from events
    const toolsUsed: Array<{ tool: string; args: any }> = [];
    for (const event of events) {
      if (event.content?.parts) {
        for (const part of event.content.parts as any[]) {
          if (part.functionCall) {
            toolsUsed.push({
              tool: part.functionCall.name,
              args: part.functionCall.args,
            });
          }
        }
      }
    }

    return NextResponse.json({
      response: responseText || 'Agent completed but no response text generated.',
      toolsUsed,
      eventCount: events.length,
      events,
      agentFramework: 'Google ADK (Agent Development Kit)',
    });

  } catch (error: any) {
    console.error('[ADK Agent] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Agent execution failed.' },
      { status: 500 }
    );
  }
}
