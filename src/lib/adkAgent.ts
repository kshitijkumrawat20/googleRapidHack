/**
 * Google ADK Agent Framework integration for Memoria AI.
 * 
 * Uses @google/adk to create an LlmAgent with FunctionTools for:
 * - Memory retrieval (vector search)
 * - Memory storage (extract & persist)
 * - Reflection generation (insight synthesis)
 * - Goal/task management
 * 
 * The ADK agent orchestrates the full cognitive loop:
 * user message → memory recall → reasoning → response → memory extraction → reflection
 */

import {
  LlmAgent,
  FunctionTool,
  isFinalResponse,
  stringifyContent,
  toStructuredEvents,
  EventType,
  type Event,
} from '@google/adk';
import { MemoryService } from './memoryService';
import {
  GoalRepository,
  TaskRepository,
  EntityRepository,
  UserRepository,
} from './repository';

// ─── Function Tools ─────────────────────────────────────────────────────────

/**
 * Tool: Recall memories relevant to a query using Atlas Vector Search.
 */
const recallMemoriesTool = new FunctionTool({
  name: 'recall_memories',
  description:
    'Search the user\'s long-term memory store for relevant past memories, preferences, goals, and context using semantic vector search. Call this when you need to recall what the user has previously told you.',
  parameters: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'The search query to find relevant memories (e.g., "user career goals", "preferred tech stack")',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of memories to retrieve (default: 5)',
      },
    },
    required: ['query'],
  },
  execute: async (args: { query: string; limit?: number }) => {
    try {
      const user = await UserRepository.getOrCreateDefaultUser();
      const context = await MemoryService.retrieveMemoryContext(
        user.id,
        args.query,
        args.limit || 5
      );
      return { success: true, memoryContext: context };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

/**
 * Tool: List the user's active goals from MongoDB.
 */
const listGoalsTool = new FunctionTool({
  name: 'list_goals',
  description:
    'Retrieve the user\'s active goals from the database. Use this to check what the user is working toward.',
  parameters: {
    type: 'object' as const,
    properties: {},
  },
  execute: async () => {
    try {
      const user = await UserRepository.getOrCreateDefaultUser();
      const goals = await GoalRepository.list(user.id);
      return {
        success: true,
        goals: goals.map((g) => ({
          title: g.title,
          status: g.status,
          targetDate: g.targetDate,
        })),
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

/**
 * Tool: List the user's pending tasks from MongoDB.
 */
const listTasksTool = new FunctionTool({
  name: 'list_tasks',
  description:
    'Retrieve the user\'s pending tasks from the database. Use this to check what action items the user has.',
  parameters: {
    type: 'object' as const,
    properties: {},
  },
  execute: async () => {
    try {
      const user = await UserRepository.getOrCreateDefaultUser();
      const tasks = await TaskRepository.list(user.id);
      return {
        success: true,
        tasks: tasks.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

/**
 * Tool: Trigger a reflection cycle to synthesize insights from stored memories.
 */
const generateReflectionTool = new FunctionTool({
  name: 'generate_reflection',
  description:
    'Analyze stored memories to generate a high-level cognitive reflection or behavioral insight. Use this when the user asks for a summary of patterns, advice, or self-analysis.',
  parameters: {
    type: 'object' as const,
    properties: {},
  },
  execute: async () => {
    try {
      const user = await UserRepository.getOrCreateDefaultUser();
      const reflection = await MemoryService.generateReflection(user.id);
      if (!reflection) {
        return { success: true, message: 'Not enough memories yet to generate a meaningful reflection.' };
      }
      return {
        success: true,
        reflection: {
          insight: reflection.insight,
          category: reflection.category,
          confidence: reflection.confidence,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

/**
 * Tool: Get known entities (people, technologies, concepts) from the knowledge graph.
 */
const listEntitiesTool = new FunctionTool({
  name: 'list_entities',
  description:
    'Retrieve known entities (technologies, people, concepts, organizations) from the user\'s knowledge graph.',
  parameters: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number' as const,
        description: 'Maximum number of entities to retrieve (default: 15)',
      },
    },
  },
  execute: async (args: { limit?: number }) => {
    try {
      const user = await UserRepository.getOrCreateDefaultUser();
      const entities = await EntityRepository.list(user.id);
      return {
        success: true,
        entities: entities.slice(0, args.limit || 15).map((e) => ({
          name: e.name,
          type: e.type,
          description: e.description,
        })),
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// ─── ADK Agent Definition ───────────────────────────────────────────────────

const AGENT_INSTRUCTION = `You are Memoria AI, a highly intelligent and proactive Personal Chief of Staff AI Agent.
You have access to a persistent memory system backed by MongoDB Atlas and Atlas Vector Search.

YOUR COGNITIVE CAPABILITIES:
1. **Memory Recall**: Use the recall_memories tool to search your long-term memory before responding. This finds semantically similar past interactions, preferences, and knowledge.
2. **Goal Tracking**: Use list_goals to check the user's active goals and provide strategic advice.
3. **Task Management**: Use list_tasks to check pending action items and follow up proactively.
4. **Reflection**: Use generate_reflection to synthesize insights from accumulated memories when asked.
5. **Knowledge Graph**: Use list_entities to recall known technologies, people, and concepts.

YOUR BEHAVIORAL GUIDELINES:
- ALWAYS call recall_memories at the start of each conversation turn to load relevant context.
- Speak as if you naturally remember things — NEVER say "Based on my database" or "I retrieved a memory".
- Instead say things like "Since you prefer TypeScript...", "How is the startup going?", "Last time we discussed..."
- Be structured, concise, and professional, yet supportive — like an executive chief of staff.
- If you identify new tasks or goals from the conversation, proactively let the user know.
- Personalize every response based on recalled memories and known entities.`;

/**
 * Create the Memoria AI ADK agent instance.
 */
export function createMemoriaAgent(): LlmAgent {
  return new LlmAgent({
    name: 'memoria_ai',
    model: 'gemini-2.5-flash',
    instruction: AGENT_INSTRUCTION,
    tools: [
      recallMemoriesTool,
      listGoalsTool,
      listTasksTool,
      generateReflectionTool,
      listEntitiesTool,
    ],
  });
}

// ─── Runner & Session Management ────────────────────────────────────────────

import { InMemoryRunner } from '@google/adk';

// Singleton runner instance  
let runnerInstance: InMemoryRunner | null = null;

function getRunner(): InMemoryRunner {
  if (!runnerInstance) {
    const agent = createMemoriaAgent();
    runnerInstance = new InMemoryRunner({
      agent,
      appName: 'memoria-ai',
    });
  }
  return runnerInstance;
}

/**
 * Run the ADK agent with a user message and return the response text + events.
 * Uses runEphemeral for a fresh session each call (we manage history in MongoDB).
 */
export async function runAgent(
  userId: string,
  _sessionId: string,
  message: string
): Promise<{ responseText: string; events: Event[] }> {
  const runner = getRunner();
  const events: Event[] = [];
  let responseText = '';

  for await (const event of runner.runEphemeral({
    userId,
    newMessage: { parts: [{ text: message }] },
  })) {
    events.push(event);

    // Use toStructuredEvents to properly extract content
    const structured = toStructuredEvents(event);
    for (const se of structured) {
      if (se.type === EventType.CONTENT) {
        responseText += se.content;
      }
    }
  }

  return { responseText, events };
}

/**
 * Run the ADK agent — yields text chunks as they arrive.
 * Uses runEphemeral to avoid corrupted session history between requests.
 */
export async function* runAgentStream(
  userId: string,
  _sessionId: string,
  message: string
): AsyncGenerator<{ type: 'text' | 'tool_call' | 'tool_result'; content: string }, void, unknown> {
  const runner = getRunner();

  for await (const event of runner.runEphemeral({
    userId,
    newMessage: { parts: [{ text: message }] },
  })) {
    // Use toStructuredEvents — the proper ADK API for extracting content
    const structured = toStructuredEvents(event);
    for (const se of structured) {
      switch (se.type) {
        case EventType.CONTENT:
          yield { type: 'text', content: se.content };
          break;
        case EventType.TOOL_CALL:
          console.log(`[ADK] Tool call: ${se.call.name}(${JSON.stringify(se.call.args)})`);
          yield {
            type: 'tool_call',
            content: JSON.stringify({ tool: se.call.name, args: se.call.args }),
          };
          break;
        case EventType.TOOL_RESULT:
          yield {
            type: 'tool_result',
            content: JSON.stringify({ tool: se.result.name, result: se.result.response }),
          };
          break;
        case EventType.ERROR:
          console.error(`[ADK] Error event: ${se.error.message}`);
          break;
        case EventType.FINISHED:
          console.log('[ADK] Agent finished.');
          break;
      }
    }
  }
}

// ─── MCP-Powered Database Explorer Agent ────────────────────────────────────

/**
 * Create an ADK agent specifically for MongoDB database exploration via MCP.
 * Uses ADK's MCPToolset to auto-discover all MongoDB MCP Server tools.
 */
export async function createMcpExplorerAgent(): Promise<{
  agent: LlmAgent;
  cleanup: () => Promise<void>;
}> {
  // Dynamic import to avoid loading MCP deps on every page
  const { MCPToolset } = await import('@google/adk');

  const mcpToolset = new MCPToolset(
    {
      type: 'StdioConnectionParams',
      serverParams: {
        command: 'npx',
        args: ['-y', 'mongodb-mcp-server'],
        env: {
          ...process.env,
          MDB_MCP_CONNECTION_STRING: process.env.MONGODB_URI || '',
        } as Record<string, string>,
      },
      timeout: 30000,
    },
    // Only expose database query tools, not destructive ones
    [
      'list-databases',
      'list-collections',
      'find',
      'aggregate',
      'count',
      'collection-schema',
      'collection-indexes',
      'db-stats',
    ]
  );

  const agent = new LlmAgent({
    name: 'mcp_db_explorer',
    model: 'gemini-2.5-flash',
    instruction: `You are a MongoDB database explorer for the "memoria_ai" database.
Use the provided MCP tools to query and analyze the database.
The database contains these collections: users, conversations, messages, memories, goals, tasks, reflections, entities, relationships, embeddings.
Always default the database parameter to "memoria_ai" unless the user specifies otherwise.
Present results in a clear, organized format.`,
    tools: [mcpToolset],
  });

  return {
    agent,
    cleanup: async () => {
      await mcpToolset.close();
    },
  };
}
