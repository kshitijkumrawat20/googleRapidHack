export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export type MemoryCategory = 'episodic' | 'semantic' | 'goal' | 'task' | 'preference' | 'reflection';

export interface Memory {
  id: string;
  userId: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  embedding?: number[];
  metadata: {
    sourceMessageId?: string;
    sourceConversationId?: string;
    confidence: number;
    score?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'abandoned';
  progress: number; // 0 to 100
  targetDate?: Date;
  linkedMemoryIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  linkedGoalId?: string;
  sourceConversationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reflection {
  id: string;
  userId: string;
  insight: string;
  category: string;
  evidence: string[]; // Quotes/summary descriptions of supporting memories
  createdAt: Date;
}

export interface Entity {
  id: string;
  userId: string;
  name: string;
  type: 'technology' | 'person' | 'concept' | 'organization' | 'project';
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Relationship {
  id: string;
  userId: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  description: string;
  createdAt: Date;
}

export interface EmbeddingRecord {
  id: string;
  userId: string;
  text: string;
  model: string;
  dimensions: number;
  vector: number[];
  sourceCollection: 'memories' | 'entities';
  sourceId: string;
  createdAt: Date;
}

export interface DBStats {
  isFallback: boolean;
  dbName: string;
  counts: {
    users: number;
    conversations: number;
    messages: number;
    memories: number;
    goals: number;
    tasks: number;
    reflections: number;
    entities: number;
    relationships: number;
    embeddings: number;
  };
}
