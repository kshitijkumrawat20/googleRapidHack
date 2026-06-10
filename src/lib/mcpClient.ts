import { spawn, ChildProcess } from 'child_process';
import readline from 'readline';
import path from 'path';

let mcpProcess: ChildProcess | null = null;
let messageIdCounter = 1;
const pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

export function initMcpServer(): Promise<void> {
  if (mcpProcess) return Promise.resolve();

  return new Promise((resolve, reject) => {
    console.log('🚀 Spawning MongoDB MCP Server subprocess via npx...');

    const MONGODB_URI = process.env.MONGODB_URI || '';
    if (!MONGODB_URI) {
      return reject(new Error('Cannot initialize MongoDB MCP Server: MONGODB_URI is not set.'));
    }

    const dnsOverridePath = path.join(process.cwd(), 'dns-override.js').replace(/\\/g, '/');

    // Spawn the official mongodb-mcp-server
    // v1.12.0 requires MDB_MCP_CONNECTION_STRING
    mcpProcess = spawn('npx.cmd', ['-y', 'mongodb-mcp-server'], {
      env: {
        ...process.env,
        MDB_MCP_CONNECTION_STRING: MONGODB_URI,
        NODE_OPTIONS: `--require "${dnsOverridePath}"`,
      },
      shell: true,
    });

    if (!mcpProcess.stdin || !mcpProcess.stdout) {
      mcpProcess.kill();
      mcpProcess = null;
      return reject(new Error('Failed to establish standard I/O channels to the MCP server.'));
    }

    // Set up line-by-line reading of standard output
    const reader = readline.createInterface({
      input: mcpProcess.stdout,
      terminal: false,
    });

    reader.on('line', (line) => {
      try {
        console.log(`[MCP Server STDOUT] received payload line`);
        const message = JSON.parse(line);

        // Check if this is a response to a pending request
        if (message.id !== undefined && pendingRequests.has(message.id)) {
          const { resolve, reject } = pendingRequests.get(message.id)!;
          pendingRequests.delete(message.id);

          if (message.error) {
            reject(message.error);
          } else {
            resolve(message.result);
          }
        }
      } catch (err) {
        console.error('[MCP Server Parser Error]: Failed to parse stdout line:', line, err);
      }
    });

    mcpProcess.stderr?.on('data', (data) => {
      console.warn(`[MCP Server STDERR]: ${data.toString().trim()}`);
    });

    mcpProcess.on('close', (code) => {
      console.warn(`[MCP Server Process Exit]: Terminated with exit code ${code}`);
      mcpProcess = null;
    });

    // Execute handshakes
    (async () => {
      try {
        // 1. Send initialize request
        console.log('[MCP Client] Sending initialize handshake...');
        await sendRequest('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'memoria-ai-nextjs-client',
            version: '1.0.0',
          },
        });

        // 2. Send initialized notification
        sendNotification('notifications/initialized');
        console.log('✅ MongoDB MCP Server handshake completed successfully.');
        resolve();
      } catch (err) {
        console.error('❌ Failed to complete handshake with MCP server:', err);
        mcpProcess?.kill();
        mcpProcess = null;
        reject(err);
      }
    })();
  });
}

function sendRequest(method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!mcpProcess || !mcpProcess.stdin) {
      return reject(new Error('MCP Server is not running. Call initMcpServer() first.'));
    }

    const id = messageIdCounter++;

    // 15-second timeout to prevent hanging forever
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`MCP request "${method}" (id=${id}) timed out after 15000ms`));
    }, 15000);

    pendingRequests.set(id, {
      resolve: (val: any) => {
        clearTimeout(timeout);
        resolve(val);
      },
      reject: (err: any) => {
        clearTimeout(timeout);
        reject(err);
      },
    });

    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    mcpProcess.stdin.write(JSON.stringify(payload) + '\n');
  });
}

function sendNotification(method: string, params: any = {}): void {
  if (!mcpProcess || !mcpProcess.stdin) {
    console.error('Cannot send notification: MCP Server is not running.');
    return;
  }

  const payload = {
    jsonrpc: '2.0',
    method,
    params,
  };

  mcpProcess.stdin.write(JSON.stringify(payload) + '\n');
}

/**
 * List the tools exposed by the MongoDB MCP Server.
 */
export async function listMcpTools(): Promise<McpTool[]> {
  await initMcpServer();
  try {
    const result = await sendRequest('tools/list');
    return (result.tools || []) as McpTool[];
  } catch (err) {
    console.error('Failed to list tools from MongoDB MCP Server:', err);
    throw err;
  }
}

/**
 * Call a specific tool on the MongoDB MCP Server.
 * @param toolName The name of the tool (e.g. 'list-collections', 'find')
 * @param args The input arguments for the tool
 */
export async function callMcpTool(toolName: string, args: any = {}): Promise<any> {
  await initMcpServer();
  try {
    console.log(`[MCP Client] Calling tool "${toolName}" with args:`, JSON.stringify(args));
    const result = await sendRequest('tools/call', {
      name: toolName,
      arguments: args,
    });
    return result;
  } catch (err) {
    console.error(`Failed to invoke tool "${toolName}" on MongoDB MCP Server:`, err);
    throw err;
  }
}

/**
 * Kill the running MCP subprocess (useful for clean teardown)
 */
export function shutdownMcpServer() {
  if (mcpProcess) {
    console.log('Shutting down MongoDB MCP Server subprocess...');
    mcpProcess.kill();
    mcpProcess = null;
  }
}
