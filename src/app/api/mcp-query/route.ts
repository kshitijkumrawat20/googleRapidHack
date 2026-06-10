import { NextRequest, NextResponse } from 'next/server';
import { createMcpExplorerAgent } from '@/lib/adkAgent';
import {
  InMemoryRunner,
  isFinalResponse,
  stringifyContent,
  getFunctionCalls,
  type Event,
} from '@google/adk';

/**
 * MCP Database Explorer API Route
 * 
 * Uses Google ADK's MCPToolset to connect to the MongoDB MCP Server.
 * ADK automatically discovers all 29 MCP tools and makes them available
 * to the Gemini model via function calling.
 * 
 * Flow:
 * 1. User sends a natural language query about the database
 * 2. ADK creates an LlmAgent with MCPToolset (MongoDB MCP Server via stdio)
 * 3. Gemini decides which MCP tools to call (list-collections, find, aggregate, etc.)
 * 4. ADK executes the tools via JSON-RPC and feeds results back to Gemini
 * 5. Gemini synthesizes a natural language answer
 */

export async function POST(req: NextRequest) {
  let cleanup: (() => Promise<void>) | null = null;

  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    console.log(`[MCP Explorer Agent] Query: "${prompt}"`);

    // Create the MCP explorer agent with ADK MCPToolset
    const { agent, cleanup: cleanupFn } = await createMcpExplorerAgent();
    cleanup = cleanupFn;

    // Run the agent
    const runner = new InMemoryRunner({
      agent,
      appName: 'memoria-mcp-explorer',
    });

    const events: Event[] = [];
    let answer = '';
    const toolCalls: Array<{ name: string; args: any; result?: any }> = [];

    for await (const event of runner.runEphemeral({
      userId: 'mcp-explorer',
      newMessage: { parts: [{ text: prompt }] },
    })) {
      events.push(event);

      // Collect final text
      if (isFinalResponse(event)) {
        const text = stringifyContent(event);
        if (text) answer += text;
      }

      // Collect tool call details for transparency
      if (event.content?.parts) {
        for (const part of event.content.parts) {
          if (part.functionCall) {
            toolCalls.push({
              name: part.functionCall.name || 'unknown',
              args: part.functionCall.args || {},
            });
          }
          if (part.functionResponse) {
            // Match to the most recent tool call
            const lastCall = toolCalls[toolCalls.length - 1];
            if (lastCall && !lastCall.result) {
              lastCall.result = part.functionResponse.response;
            }
          }
        }
      }
    }

    console.log(`[MCP Explorer Agent] Tools used: ${toolCalls.map(t => t.name).join(', ')}`);
    console.log(`[MCP Explorer Agent] Answer length: ${answer.length} chars`);

    return NextResponse.json({
      answer: answer || 'Query completed but no summary generated.',
      toolCalls,
      agentFramework: 'Google ADK v1.2.0',
    });

  } catch (error: any) {
    console.error('[MCP Explorer Agent] Error:', error);
    return NextResponse.json(
      { error: error.message || 'MCP Query failed.' },
      { status: 500 }
    );
  } finally {
    // Clean up MCP subprocess
    if (cleanup) {
      try {
        await cleanup();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}
