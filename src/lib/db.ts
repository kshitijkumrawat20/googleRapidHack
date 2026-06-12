import { MongoClient, Db } from 'mongodb';
import dns from 'dns';
import { Resolver } from 'dns';
import { headers, cookies } from 'next/headers';
import { verifySession, decrypt } from './auth-utils';

const MONGODB_DB = process.env.MONGODB_DB || 'memoria_ai';

// Cache connections per connection string
interface CachedConnection {
  client: MongoClient;
  db: Db;
}
const cachedConnections = new Map<string, CachedConnection>();

export interface DbConnection {
  db: Db;
  isFallback: boolean;
  dbName: string;
}

/**
 * Manually resolve SRV records using Google DNS (8.8.8.8)
 * and build a standard mongodb:// connection string.
 * This bypasses the MongoDB driver's internal SRV resolution
 * which fails on networks that block SRV queries.
 */
async function resolveAtlasSrv(srvUri: string): Promise<string> {
  // Parse the mongodb+srv:// URI
  const match = srvUri.match(
    /^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/
  );
  if (!match) {
    throw new Error('Invalid mongodb+srv:// URI format');
  }

  const [, credentials, host, dbPath = '/', queryString = ''] = match;
  const srvHostname = `_mongodb._tcp.${host}`;

  console.log(`🔍 Manually resolving SRV: ${srvHostname} via Google DNS...`);

  // Create a dedicated resolver pinned to Google DNS
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '8.8.4.4']);

  // Resolve SRV records
  const srvRecords = await new Promise<dns.SrvRecord[]>((resolve, reject) => {
    resolver.resolveSrv(srvHostname, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });

  if (!srvRecords || srvRecords.length === 0) {
    throw new Error(`No SRV records found for ${srvHostname}`);
  }

  // Also resolve TXT for replica set / authSource
  let txtOptions = '';
  try {
    const txtRecords = await new Promise<string[][]>((resolve, reject) => {
      resolver.resolveTxt(host, (err, records) => {
        if (err) resolve([]);
        else resolve(records);
      });
    });
    if (txtRecords.length > 0) {
      txtOptions = txtRecords[0].join('');
    }
  } catch {
    // TXT resolution is optional
  }

  // Build the standard mongodb:// connection string
  const hostList = srvRecords
    .map((r) => `${r.name}:${r.port}`)
    .join(',');

  // Merge TXT options with existing query params
  let params = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  if (txtOptions) {
    params = params ? `${txtOptions}&${params}` : txtOptions;
  }
  // Ensure ssl=true (Atlas requires it)
  if (!params.includes('tls=') && !params.includes('ssl=')) {
    params = params ? `${params}&tls=true` : 'tls=true';
  }

  const standardUri = `mongodb://${credentials}@${hostList}${dbPath}?${params}`;
  console.log(
    `✅ Resolved ${srvRecords.length} hosts: ${srvRecords.map((r) => r.name).join(', ')}`
  );
  return standardUri;
}

/**
 * Automatically create the Atlas Vector Search index on the Memories collection
 * if it is not already present. Failsafe to allow in-database cosine calculation if unsupported.
 */
async function createSearchIndexIfMissing(db: Db): Promise<void> {
  const collection = db.collection('memories');
  try {
    const existing = await collection.listSearchIndexes().toArray();
    if (existing.some(i => i.name === 'vector_index')) {
      console.log('✅ [DB Setup] Atlas Vector Search index "vector_index" already exists.');
      return;
    }
  } catch (err) {
    // Ignore error if search index API is unsupported on this cluster
  }

  console.log('🔨 [DB Setup] Creating Atlas Vector Search index "vector_index" dynamically...');
  const indexDefinition = {
    name: 'vector_index',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: 768,
          similarity: 'cosine'
        },
        {
          type: 'filter',
          path: 'userId'
        },
        {
          type: 'filter',
          path: 'category'
        }
      ]
    }
  };

  try {
    await collection.createSearchIndex(indexDefinition);
    console.log('✅ [DB Setup] Dynamic Atlas Vector Search index created successfully.');
  } catch (err: any) {
    console.warn(`⚠️ [DB Setup] Auto-creation of search index failed: ${err.message}.`);
  }
}

export async function connectToDatabase(): Promise<DbConnection> {
  let customUri: string | null = null;
  
  // 1. Try reading the dynamic header first (useful for testing scripts / CLI)
  try {
    const requestHeaders = await headers();
    customUri = requestHeaders.get('x-mongodb-uri');
  } catch {
    // Headers are not available outside request context
  }

  // 2. Try reading the secure HTTP-only session cookie
  if (!customUri) {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('memoria_session');
      if (sessionCookie?.value) {
        const session = verifySession(sessionCookie.value);
        if (session && session.customDbUri) {
          customUri = decrypt(session.customDbUri);
        }
      }
    } catch {
      // Cookies are not available outside request context (e.g. build time, instrumentation)
    }
  }

  if (customUri) {
    console.log('🔌 Dynamic DB routing: connecting to user-specified cluster.');
  }

  const MONGODB_URI = customUri || process.env.MONGODB_URI || '';

  if (!MONGODB_URI) {
    throw new Error(
      '❌ Fatal: MONGODB_URI environment variable is missing. Strict MongoDB connectivity is required.'
    );
  }

  // Extract database name from connection string path if present
  let dbName = MONGODB_DB;
  try {
    const match = MONGODB_URI.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
    if (match && match[1]) {
      dbName = match[1];
    }
  } catch {
    // Fallback to MONGODB_DB
  }

  // Return cached connection if available and alive
  if (cachedConnections.has(MONGODB_URI)) {
    const cached = cachedConnections.get(MONGODB_URI)!;
    try {
      // Quick ping to verify the cached connection is still alive
      await cached.db.command({ ping: 1 });
      return { db: cached.db, isFallback: false, dbName };
    } catch {
      console.warn('⚠️ Cached connection stale, reconnecting...');
      cachedConnections.delete(MONGODB_URI);
    }
  }

  const maxRetries = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔌 Connecting to MongoDB Atlas (Attempt ${attempt}/${maxRetries})...`
      );

      // If it's an SRV URI, manually resolve it first
      let connectionUri = MONGODB_URI;
      if (MONGODB_URI.startsWith('mongodb+srv://')) {
        connectionUri = await resolveAtlasSrv(MONGODB_URI);
      }

      const client = new MongoClient(connectionUri, {
        connectTimeoutMS: 20000,
        socketTimeoutMS: 20000,
        serverSelectionTimeoutMS: 20000,
      });

      await client.connect();
      const db = client.db(dbName);

      // Cache the connection
      cachedConnections.set(MONGODB_URI, { client, db });

      console.log(
        '✅ Successfully connected to MongoDB Atlas database:',
        dbName
      );

      // Attempt search index creation in background
      createSearchIndexIfMissing(db).catch((e) => {
        console.warn('Index build background task failed:', e.message);
      });

      return { db, isFallback: false, dbName };
    } catch (err) {
      lastError = err;
      console.warn(
        `⚠️ Connection attempt ${attempt} failed: ${(err as Error).message}`
      );
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('❌ All connection attempts to MongoDB Atlas failed.', lastError);
  throw new Error(
    `Failed to connect to MongoDB after ${maxRetries} attempts: ${(lastError as Error).message}`
  );
}

// Helper for Cosine Similarity (used for vector search sorting fallback if Index is still building)
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
