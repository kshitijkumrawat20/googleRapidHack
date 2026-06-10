import { getEmbedding, generateStructuredJson, GeminiSchemaTypes, Schema } from './gemini';
import { 
  MemoryRepository, 
  GoalRepository, 
  TaskRepository, 
  ReflectionRepository,
  EntityRepository,
  RelationshipRepository,
  EmbeddingRepository
} from './repository';
import { Memory, MemoryCategory, Goal, Task, Reflection, Entity, Relationship, EmbeddingRecord } from '../types';

const { Type } = GeminiSchemaTypes;

// Structured Schema for Memories, Entities, and Relationships Extraction
const memoryExtractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    memories: {
      type: Type.ARRAY,
      description: "List of memories, goals, tasks, or preferences extracted from the conversation.",
      items: {
        type: Type.OBJECT,
        properties: {
          content: { 
            type: Type.STRING, 
            description: "The extracted memory content. Write it as a clear statement (e.g. 'User prefers TypeScript over JavaScript')." 
          },
          category: { 
            type: Type.STRING, 
            description: "Category of the memory.",
            enum: ['episodic', 'semantic', 'goal', 'task', 'preference'] 
          },
          tags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "2-3 short keyword tags (e.g. ['tech-stack', 'typescript'])." 
          },
          confidence: { 
            type: Type.NUMBER, 
            description: "Confidence rating of the extraction between 0.0 and 1.0." 
          }
        },
        required: ['content', 'category', 'tags', 'confidence']
      }
    },
    entities: {
      type: Type.ARRAY,
      description: "Key technologies, programming languages, concepts, projects, or people mentioned in the conversation.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the entity (e.g. 'TypeScript', 'MongoDB Atlas', 'John Doe')."
          },
          type: {
            type: Type.STRING,
            description: "The type of the entity.",
            enum: ['technology', 'person', 'concept', 'organization', 'project']
          },
          description: {
            type: Type.STRING,
            description: "Brief 1-sentence explanation of what this entity is in context."
          }
        },
        required: ['name', 'type', 'description']
      }
    },
    relationships: {
      type: Type.ARRAY,
      description: "Relations linking the extracted entities together based on user preference or projects.",
      items: {
        type: Type.OBJECT,
        properties: {
          sourceEntityName: {
            type: Type.STRING,
            description: "Name of the source entity (e.g. 'Developer')."
          },
          targetEntityName: {
            type: Type.STRING,
            description: "Name of the target entity (e.g. 'TypeScript')."
          },
          type: {
            type: Type.STRING,
            description: "Verb phrase connecting them (e.g. 'prefers', 'uses', 'builds', 'worksOn')."
          },
          description: {
            type: Type.STRING,
            description: "Explain the connection (e.g. 'Developer prefers writing in TypeScript')."
          }
        },
        required: ['sourceEntityName', 'targetEntityName', 'type', 'description']
      }
    }
  },
  required: ['memories', 'entities', 'relationships']
};

// Structured Schema for Reflection Engine
const reflectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    insight: { 
      type: Type.STRING, 
      description: "A high-level behavioral insight, cognitive pattern, or strategic advice derived from analyzing the user's memory history." 
    },
    category: { 
      type: Type.STRING, 
      description: "Category of the insight (e.g., 'productivity', 'habits', 'strategy', 'technical')." 
    },
    evidence: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of supporting memories or quotes that prove this insight." 
    }
  },
  required: ['insight', 'category', 'evidence']
};

interface ExtractedMemoryInput {
  content: string;
  category: MemoryCategory;
  tags: string[];
  confidence: number;
}

interface ExtractedEntityInput {
  name: string;
  type: 'technology' | 'person' | 'concept' | 'organization' | 'project';
  description: string;
}

interface ExtractedRelationshipInput {
  sourceEntityName: string;
  targetEntityName: string;
  type: string;
  description: string;
}

interface ExtractionResult {
  memories: ExtractedMemoryInput[];
  entities: ExtractedEntityInput[];
  relationships: ExtractedRelationshipInput[];
}

export const MemoryService = {
  /**
   * Extracts and stores memories, entities, relationships, and registers embeddings.
   */
  async extractAndStoreMemories(
    userId: string,
    userMessage: string,
    assistantResponse: string,
    conversationId: string,
    messageId: string
  ): Promise<Memory[]> {
    console.log(`[MemoryService] Triggering memory & graph extraction for conversation ${conversationId}`);
    
    const contextPrompt = `
      Analyze the following conversation exchange:
      User Message: "${userMessage}"
      Assistant Response: "${assistantResponse}"

      Your task is to extract three types of information:
      1. Long-term Memories: Important events (episodic), facts (semantic), objectives (goal), action items (task), or choices (preference).
      2. Key Entities: Specific named items (technologies, tools, languages, people, concepts, organizations) that are core to the user's objectives.
      3. Entity Relationships: Explanatory links connecting the entities (e.g. 'Developer' -> 'prefers' -> 'TypeScript', 'Project' -> 'uses' -> 'MongoDB').

      Only extract entries that are highly relevant to assisting the user long-term.
    `;

    try {
      const result = await generateStructuredJson<ExtractionResult>(
        contextPrompt,
        memoryExtractionSchema,
        "You are an expert Chief of Staff AI that extracts structured personal knowledge, named entities, and semantic relationships from chat logs."
      );

      const extractedMemories = result.memories || [];
      const extractedEntities = result.entities || [];
      const extractedRelationships = result.relationships || [];

      console.log(`[MemoryService] Extracted ${extractedMemories.length} memories, ${extractedEntities.length} entities, and ${extractedRelationships.length} relationships.`);

      const savedMemories: Memory[] = [];
      const entityMap = new Map<string, string>(); // Maps Entity Name -> Entity ID

      // 1. PROCESS MEMORIES
      for (const item of extractedMemories) {
        if (item.confidence < 0.7) continue;

        // Generate embedding vector
        const embedding = await getEmbedding(item.content);

        // Store Memory
        const memoryDoc = await MemoryRepository.create({
          userId,
          content: item.content,
          category: item.category,
          tags: item.tags,
          embedding,
          metadata: {
            sourceMessageId: messageId,
            sourceConversationId: conversationId,
            confidence: item.confidence
          }
        });
        
        savedMemories.push(memoryDoc);

        // Register in explicit embeddings ledger
        await EmbeddingRepository.create({
          userId,
          text: item.content,
          model: 'gemini-embedding-001',
          dimensions: 768,
          vector: embedding,
          sourceCollection: 'memories',
          sourceId: memoryDoc.id
        });

        // Auto-create checklist structures
        if (item.category === 'task') {
          await TaskRepository.create({
            userId,
            title: item.content,
            status: 'pending',
            sourceConversationId: conversationId
          });
        } else if (item.category === 'goal') {
          await GoalRepository.create({
            userId,
            title: item.content,
            description: "Extracted goal from chat conversation.",
            status: 'active',
            progress: 0,
            linkedMemoryIds: [memoryDoc.id]
          });
        }
      }

      // 2. PROCESS ENTITIES
      for (const ent of extractedEntities) {
        // Check if entity exists
        let entityDoc = await EntityRepository.findByName(userId, ent.name);
        if (!entityDoc) {
          entityDoc = await EntityRepository.create({
            userId,
            name: ent.name,
            type: ent.type,
            description: ent.description
          });
          
          // Generate embedding for entity details
          const entityText = `Entity: ${ent.name}. Type: ${ent.type}. Description: ${ent.description}`;
          const embedding = await getEmbedding(entityText);
          
          // Save embedding record
          await EmbeddingRepository.create({
            userId,
            text: entityText,
            model: 'gemini-embedding-001',
            dimensions: 768,
            vector: embedding,
            sourceCollection: 'entities',
            sourceId: entityDoc.id
          });
        }
        entityMap.set(ent.name.toLowerCase(), entityDoc.id);
      }

      // Always ensure the default 'Developer' or 'User' entity exists to build links
      let userEntity = await EntityRepository.findByName(userId, 'Developer');
      if (!userEntity) {
        userEntity = await EntityRepository.create({
          userId,
          name: 'Developer',
          type: 'person',
          description: 'The primary user and developer operating the Chief of Staff agent.'
        });
      }
      entityMap.set('developer', userEntity.id);
      entityMap.set('user', userEntity.id);

      // 3. PROCESS RELATIONSHIPS
      for (const rel of extractedRelationships) {
        const sourceId = entityMap.get(rel.sourceEntityName.toLowerCase());
        const targetId = entityMap.get(rel.targetEntityName.toLowerCase());

        if (sourceId && targetId) {
          await RelationshipRepository.create({
            userId,
            sourceEntityId: sourceId,
            targetEntityId: targetId,
            type: rel.type,
            description: rel.description
          });
          console.log(`[MemoryService] Linked: ${rel.sourceEntityName} --[${rel.type}]-- ${rel.targetEntityName}`);
        } else {
          console.warn(`[MemoryService] Skipped relationship linking because entity IDs were missing: Source: ${rel.sourceEntityName} (${sourceId}), Target: ${rel.targetEntityName} (${targetId})`);
        }
      }

      return savedMemories;
    } catch (err) {
      console.error('Error in memory/entity/relationship extraction:', err);
      return [];
    }
  },

  /**
   * Retrieves relevant memories using semantic vector search and formats them for prompt injection.
   */
  async retrieveMemoryContext(userId: string, query: string, limit = 5): Promise<string> {
    console.log(`[MemoryService] Retrieving memory context for query: "${query}"`);
    try {
      const queryEmbedding = await getEmbedding(query);
      const matches = await MemoryRepository.vectorSearch(userId, queryEmbedding, limit);
      
      if (matches.length === 0) {
        return "No relevant past memories found.";
      }

      let contextStr = "### RETRIEVED MEMORIES & PREFERENCES:\n";
      matches.forEach((m, idx) => {
        const scoreStr = m.metadata.score ? ` (similarity: ${(m.metadata.score * 100).toFixed(1)}%)` : '';
        contextStr += `${idx + 1}. [${m.category.toUpperCase()}] ${m.content}${scoreStr} - Tags: ${m.tags.join(', ')}\n`;
      });
      
      // Also attach a brief list of extracted technologies/concepts for context
      const entities = await EntityRepository.list(userId);
      if (entities.length > 0) {
        contextStr += "\n### KNOWN CONCEPTS & ENTITIES:\n";
        entities.slice(0, 10).forEach(e => {
          contextStr += `- ${e.name} (${e.type}): ${e.description}\n`;
        });
      }

      return contextStr;
    } catch (err) {
      console.error('Error retrieving memory context:', err);
      return "Error retrieving past memory context.";
    }
  },

  /**
   * Periodic or manual trigger that analyzes user history and creates a reflection memory.
   */
  async generateReflection(userId: string): Promise<Reflection | null> {
    console.log(`[MemoryService] Analyzing memories to generate reflection for user ${userId}`);
    try {
      const memories = await MemoryRepository.list(userId);
      if (memories.length < 3) {
        console.log('[MemoryService] Not enough memories (< 3) to generate a meaningful reflection.');
        return null;
      }

      // Format memories as evidence for the model
      const memoriesText = memories
        .map(m => `- [${m.category.toUpperCase()}] ${m.content} (Tags: ${m.tags.join(', ')})`)
        .slice(0, 30)
        .join('\n');

      const reflectionPrompt = `
        Review the following list of stored memories and user preferences:
        ${memoriesText}

        Analyze the records to find:
        1. Action patterns (e.g., "You frequently declare technical preferences but experience delay on business goals").
        2. Hidden priorities or core principles.
        3. Strategic advice or observations.

        Generate a high-level cognitive reflection or behavioral insight.
      `;

      const result = await generateStructuredJson<Omit<Reflection, 'id' | 'createdAt' | 'userId'>>(
        reflectionPrompt,
        reflectionSchema,
        "You are a master executive coach and Chief of Staff. You analyze historical memories to discover strategic behavioral patterns and insights."
      );

      if (!result.insight) {
        return null;
      }

      // 1. Create and store the Reflection document
      const reflection = await ReflectionRepository.create({
        userId,
        insight: result.insight,
        category: result.category,
        evidence: result.evidence
      });

      console.log(`[MemoryService] Created reflection: "${result.insight}"`);

      // 2. Feed the reflection BACK into the memory store as a new memory, embedding it.
      const content = `Behavioral Insight (${result.category}): ${result.insight}`;
      const reflectionEmbedding = await getEmbedding(`[Reflection Insight] Category: ${result.category}. ${result.insight} Evidence: ${result.evidence.join(', ')}`);
      
      const memoryDoc = await MemoryRepository.create({
        userId,
        content: content,
        category: 'reflection',
        tags: ['reflection', result.category],
        embedding: reflectionEmbedding,
        metadata: {
          confidence: 0.90,
          reflectionId: reflection.id
        }
      });

      // Save to embeddings ledger
      await EmbeddingRepository.create({
        userId,
        text: content,
        model: 'gemini-embedding-001',
        dimensions: 768,
        vector: reflectionEmbedding,
        sourceCollection: 'memories',
        sourceId: memoryDoc.id
      });

      return reflection;
    } catch (err) {
      console.error('Error generating reflection:', err);
      return null;
    }
  }
};
