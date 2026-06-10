import { ObjectId } from 'mongodb';
import { connectToDatabase, cosineSimilarity } from './db';
import { User, Conversation, Message, Memory, Goal, Task, Reflection, Entity, Relationship, EmbeddingRecord, DBStats } from '../types';

// Helper to safely convert a string ID to MongoDB ObjectId if possible
function toMongoId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch (err) {
    throw new Error(`Invalid ObjectId format: ${id}`);
  }
}

// Map MongoDB document (with _id) to our clean TS interface (with string id)
function mapDocument<T extends { _id?: ObjectId | string }>(doc: T | null): any {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    id: _id?.toString(),
    ...rest,
  };
}

export const UserRepository = {
  async getOrCreateDefaultUser(): Promise<User> {
    const conn = await connectToDatabase();
    const defaultUser = {
      name: 'Hackathon Developer',
      email: 'dev@memoria.ai',
    };

    const collection = conn.db.collection('users');
    let doc = await collection.findOne({ email: defaultUser.email });
    if (!doc) {
      const result = await collection.insertOne({
        ...defaultUser,
        createdAt: new Date(),
      });
      doc = await collection.findOne({ _id: result.insertedId });
    }
    return mapDocument(doc);
  }
};

export const ConversationRepository = {
  async list(userId: string): Promise<Conversation[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('conversations')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
    return docs.map(mapDocument);
  },

  async get(id: string): Promise<Conversation | null> {
    const conn = await connectToDatabase();
    const doc = await conn.db.collection('conversations').findOne({ _id: toMongoId(id) });
    return mapDocument(doc);
  },

  async create(userId: string, title: string): Promise<Conversation> {
    const conn = await connectToDatabase();
    const now = new Date();
    const collection = conn.db.collection('conversations');
    const result = await collection.insertOne({
      userId,
      title,
      createdAt: now,
      updatedAt: now
    });
    const doc = await collection.findOne({ _id: result.insertedId });
    return mapDocument(doc);
  },

  async updateTitle(id: string, title: string): Promise<void> {
    const conn = await connectToDatabase();
    const now = new Date();
    await conn.db.collection('conversations').updateOne(
      { _id: toMongoId(id) },
      { $set: { title, updatedAt: now } }
    );
  },

  async delete(id: string): Promise<void> {
    const conn = await connectToDatabase();
    await conn.db.collection('conversations').deleteOne({ _id: toMongoId(id) });
    await conn.db.collection('messages').deleteMany({ conversationId: id });
  }
};

export const MessageRepository = {
  async listByConversation(conversationId: string): Promise<Message[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('messages')
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray();
    return docs.map(mapDocument);
  },

  async create(conversationId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
    const conn = await connectToDatabase();
    const now = new Date();
    const result = await conn.db.collection('messages').insertOne({
      conversationId,
      role,
      content,
      createdAt: now
    });
    
    // Update conversation timestamp
    await conn.db.collection('conversations').updateOne(
      { _id: toMongoId(conversationId) },
      { $set: { updatedAt: now } }
    );
    
    const doc = await conn.db.collection('messages').findOne({ _id: result.insertedId });
    return mapDocument(doc);
  }
};

export const MemoryRepository = {
  async list(userId: string): Promise<Memory[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('memories')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(mapDocument);
  },

  async create(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
    const conn = await connectToDatabase();
    const now = new Date();
    const collection = conn.db.collection('memories');
    const result = await collection.insertOne({
      ...memory,
      createdAt: now,
      updatedAt: now
    });
    const doc = await collection.findOne({ _id: result.insertedId });
    return mapDocument(doc);
  },

  async delete(id: string): Promise<void> {
    const conn = await connectToDatabase();
    await conn.db.collection('memories').deleteOne({ _id: toMongoId(id) });
  },

  async vectorSearch(userId: string, queryVector: number[], limit = 5): Promise<Memory[]> {
    const conn = await connectToDatabase();
    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryVector,
            numCandidates: 100,
            limit: limit
          }
        },
        {
          $match: { userId: userId }
        },
        {
          $project: {
            userId: 1,
            content: 1,
            category: 1,
            tags: 1,
            metadata: 1,
            createdAt: 1,
            updatedAt: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ];

      const docs = await conn.db.collection('memories').aggregate(pipeline).toArray();
      return docs.map(doc => {
        const mem = mapDocument(doc);
        mem.metadata = {
          ...mem.metadata,
          score: doc.score
        };
        return mem;
      });
    } catch (err) {
      console.warn('MongoDB Atlas Vector Search index search failed, falling back to database cosine calculation:', err);
      // Cosine similarity fallback within the connected MongoDB database if index is not fully propagated
      const allMemories = await conn.db.collection('memories').find({ userId }).toArray();
      const scored = allMemories
        .filter(doc => doc.embedding)
        .map(doc => {
          const score = cosineSimilarity(queryVector, doc.embedding);
          const mem = mapDocument(doc);
          mem.metadata = { ...mem.metadata, score };
          return mem;
        })
        .sort((a, b) => (b.metadata.score ?? 0) - (a.metadata.score ?? 0))
        .slice(0, limit);
      return scored;
    }
  }
};

export const GoalRepository = {
  async list(userId: string): Promise<Goal[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('goals').find({ userId }).toArray();
    return docs.map(mapDocument);
  },

  async get(id: string): Promise<Goal | null> {
    const conn = await connectToDatabase();
    const doc = await conn.db.collection('goals').findOne({ _id: toMongoId(id) });
    return mapDocument(doc);
  },

  async create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const conn = await connectToDatabase();
    const now = new Date();
    const data = {
      ...goal,
      targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
    };
    const result = await conn.db.collection('goals').insertOne({
      ...data,
      createdAt: now,
      updatedAt: now
    });
    const doc = await conn.db.collection('goals').findOne({ _id: result.insertedId });
    return mapDocument(doc);
  },

  async update(id: string, updates: Partial<Goal>): Promise<void> {
    const conn = await connectToDatabase();
    const now = new Date();
    const data = { ...updates, updatedAt: now };
    await conn.db.collection('goals').updateOne(
      { _id: toMongoId(id) },
      { $set: data }
    );
  },

  async delete(id: string): Promise<void> {
    const conn = await connectToDatabase();
    await conn.db.collection('goals').deleteOne({ _id: toMongoId(id) });
    await conn.db.collection('tasks').updateMany({ linkedGoalId: id }, { $unset: { linkedGoalId: "" } });
  }
};

export const TaskRepository = {
  async list(userId: string): Promise<Task[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('tasks').find({ userId }).sort({ createdAt: -1 }).toArray();
    return docs.map(mapDocument);
  },

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const conn = await connectToDatabase();
    const now = new Date();
    const data = {
      ...task,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    };
    const result = await conn.db.collection('tasks').insertOne({
      ...data,
      createdAt: now,
      updatedAt: now
    });
    const doc = await conn.db.collection('tasks').findOne({ _id: result.insertedId });
    return mapDocument(doc);
  },

  async updateStatus(id: string, status: Task['status']): Promise<void> {
    const conn = await connectToDatabase();
    const now = new Date();
    await conn.db.collection('tasks').updateOne(
      { _id: toMongoId(id) },
      { $set: { status, updatedAt: now } }
    );
  },

  async delete(id: string): Promise<void> {
    const conn = await connectToDatabase();
    await conn.db.collection('tasks').deleteOne({ _id: toMongoId(id) });
  }
};

export const ReflectionRepository = {
  async list(userId: string): Promise<Reflection[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('reflections').find({ userId }).sort({ createdAt: -1 }).toArray();
    return docs.map(mapDocument);
  },

  async create(reflection: Omit<Reflection, 'id' | 'createdAt'>): Promise<Reflection> {
    const conn = await connectToDatabase();
    const now = new Date();
    const result = await conn.db.collection('reflections').insertOne({
      ...reflection,
      createdAt: now
    });
    const doc = await conn.db.collection('reflections').findOne({ _id: result.insertedId });
    return mapDocument(doc);
  },

  async delete(id: string): Promise<void> {
    const conn = await connectToDatabase();
    await conn.db.collection('reflections').deleteOne({ _id: toMongoId(id) });
  }
};

export const EntityRepository = {
  async list(userId: string): Promise<Entity[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('entities')
      .find({ userId })
      .sort({ name: 1 })
      .toArray();
    return docs.map(mapDocument);
  },

  async create(entity: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Entity> {
    const conn = await connectToDatabase();
    const now = new Date();
    const result = await conn.db.collection('entities').insertOne({
      ...entity,
      createdAt: now,
      updatedAt: now
    });
    const doc = await conn.db.collection('entities').findOne({ _id: result.insertedId });
    return mapDocument(doc);
  },

  async findByName(userId: string, name: string): Promise<Entity | null> {
    const conn = await connectToDatabase();
    const doc = await conn.db.collection('entities').findOne({ 
      userId, 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    return mapDocument(doc);
  },

  async delete(id: string): Promise<void> {
    const conn = await connectToDatabase();
    await conn.db.collection('entities').deleteOne({ _id: toMongoId(id) });
    // Clean up related relationships
    await conn.db.collection('relationships').deleteMany({
      $or: [{ sourceEntityId: id }, { targetEntityId: id }]
    });
  }
};

export const RelationshipRepository = {
  async list(userId: string): Promise<Relationship[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('relationships').find({ userId }).toArray();
    return docs.map(mapDocument);
  },

  async create(relationship: Omit<Relationship, 'id' | 'createdAt'>): Promise<Relationship> {
    const conn = await connectToDatabase();
    const now = new Date();
    const result = await conn.db.collection('relationships').insertOne({
      ...relationship,
      createdAt: now
    });
    const doc = await conn.db.collection('relationships').findOne({ _id: result.insertedId });
    return mapDocument(doc);
  },

  async delete(id: string): Promise<void> {
    const conn = await connectToDatabase();
    await conn.db.collection('relationships').deleteOne({ _id: toMongoId(id) });
  }
};

export const EmbeddingRepository = {
  async list(userId: string): Promise<EmbeddingRecord[]> {
    const conn = await connectToDatabase();
    const docs = await conn.db.collection('embeddings')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(mapDocument);
  },

  async create(record: Omit<EmbeddingRecord, 'id' | 'createdAt'>): Promise<EmbeddingRecord> {
    const conn = await connectToDatabase();
    const now = new Date();
    const result = await conn.db.collection('embeddings').insertOne({
      ...record,
      createdAt: now
    });
    const doc = await conn.db.collection('embeddings').findOne({ _id: result.insertedId });
    return mapDocument(doc);
  }
};

export const DbConsoleRepository = {
  async getStats(userId: string): Promise<DBStats> {
    const conn = await connectToDatabase();
    const [u, c, m, mem, g, t, r, ent, rel, emb] = await Promise.all([
      conn.db.collection('users').countDocuments(),
      conn.db.collection('conversations').countDocuments({ userId }),
      conn.db.collection('messages').countDocuments(),
      conn.db.collection('memories').countDocuments({ userId }),
      conn.db.collection('goals').countDocuments({ userId }),
      conn.db.collection('tasks').countDocuments({ userId }),
      conn.db.collection('reflections').countDocuments({ userId }),
      conn.db.collection('entities').countDocuments({ userId }),
      conn.db.collection('relationships').countDocuments({ userId }),
      conn.db.collection('embeddings').countDocuments({ userId })
    ]);
    
    return {
      isFallback: false,
      dbName: conn.dbName,
      counts: {
        users: u,
        conversations: c,
        messages: m,
        memories: mem,
        goals: g,
        tasks: t,
        reflections: r,
        entities: ent,
        relationships: rel,
        embeddings: emb
      }
    };
  }
};
