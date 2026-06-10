import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { callMcpTool } from '@/lib/mcpClient';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_DB = 'memoria_ai';

const mcpDatabaseTools = [
  {
    functionDeclarations: [
      {
        name: 'list_databases',
        description: 'List all databases in the MongoDB deployment.',
        parameters: { type: 'OBJECT', properties: {} }
      },
      {
        name: 'list_collections',
        description: 'List all collections in a specific database.',
        parameters: {
          type: 'OBJECT',
          properties: {
            database: { type: 'STRING', description: 'Database name (default: memoria_ai)' }
          }
        }
      },
      {
        name: 'find_documents',
        description: 'Query documents in a MongoDB collection using a filter.',
        parameters: {
          type: 'OBJECT',
          properties: {
            database: { type: 'STRING', description: 'Database name (default: memoria_ai)' },
            collection: { type: 'STRING', description: 'Collection name (e.g. memories, goals, tasks, entities)' },
            filter: { type: 'OBJECT', description: 'MongoDB query filter (e.g. {category: "goal"})' },
            limit: { type: 'NUMBER', description: 'Max documents to return (default 10)' }
          },
          required: ['collection']
        }
      },
      {
        name: 'run_aggregation',
        description: 'Run an aggregation pipeline on a collection for statistics or complex queries.',
        parameters: {
          type: 'OBJECT',
          properties: {
            database: { type: 'STRING', description: 'Database name (default: memoria_ai)' },
            collection: { type: 'STRING', description: 'Collection name' },
            pipeline: { type: 'ARRAY', items: { type: 'OBJECT' }, description: 'Aggregation pipeline stages' }
          },
          required: ['collection', 'pipeline']
        }
      },
      {
        name: 'count_documents',
        description: 'Count the number of documents in a collection, optionally with a filter.',
        parameters: {
          type: 'OBJECT',
          properties: {
            database: { type: 'STRING', description: 'Database name (default: memoria_ai)' },
            collection: { type: 'STRING', description: 'Collection name' },
            query: { type: 'OBJECT', description: 'Optional filter query' }
          },
          required: ['collection']
        }
      }
    ]
  }
];

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing.' }, { status: 400 });
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log(`[MCP Query Agent] Received query: "${prompt}"`);

    // 1. Gemini decides which tool to call
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are a MongoDB database explorer for the "memoria_ai" database. Use the provided tools to query the database. The database contains these collections: users, conversations, messages, memories, goals, tasks, reflections, entities, relationships, embeddings. Always default database to "memoria_ai" unless the user specifies otherwise.`,
        tools: mcpDatabaseTools as any
      }
    });

    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      return NextResponse.json({
        answer: response.text || "No database query needed.",
        toolCalls: []
      });
    }

    const call = functionCalls[0];
    const args = call.args ?? {};
    const db = (args.database as string) || DEFAULT_DB;
    console.log(`[MCP Query Agent] Tool: "${call.name}" args:`, JSON.stringify(args));

    let toolResult: any = null;
    let mcpToolName = '';

    // 2. Route to MCP Server
    switch (call.name) {
      case 'list_databases':
        mcpToolName = 'list-databases';
        toolResult = await callMcpTool('list-databases', {});
        break;
      case 'list_collections':
        mcpToolName = 'list-collections';
        toolResult = await callMcpTool('list-collections', { database: db });
        break;
      case 'find_documents':
        mcpToolName = 'find';
        toolResult = await callMcpTool('find', {
          database: db,
          collection: args.collection,
          filter: args.filter || {},
          limit: args.limit || 10
        });
        break;
      case 'run_aggregation':
        mcpToolName = 'aggregate';
        toolResult = await callMcpTool('aggregate', {
          database: db,
          collection: args.collection,
          pipeline: args.pipeline
        });
        break;
      case 'count_documents':
        mcpToolName = 'count';
        toolResult = await callMcpTool('count', {
          database: db,
          collection: args.collection,
          query: args.query || {}
        });
        break;
      default:
        throw new Error(`Unsupported tool: ${call.name}`);
    }

    console.log(`[MCP Query Agent] MCP tool "${mcpToolName}" executed successfully.`);

    // 3. Feed results back to Gemini for synthesis
    const followUp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: prompt }] } as any,
        { role: 'model', parts: [{ functionCall: { name: call.name, args: call.args } }] } as any,
        {
          role: 'user',
          parts: [{
            functionResponse: {
              name: call.name,
              response: { content: [{ type: 'text', text: JSON.stringify(toolResult) }] }
            }
          }]
        } as any
      ]
    });

    return NextResponse.json({
      answer: followUp.text || 'Query completed but no summary generated.',
      toolCalls: [{
        name: mcpToolName,
        args: args,
        result: toolResult
      }]
    });

  } catch (error: any) {
    console.error('[MCP Query Agent] Error:', error);
    return NextResponse.json(
      { error: error.message || 'MCP Query failed.' },
      { status: 500 }
    );
  }
}
