import { GoogleGenAI, Type, Schema } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (aiInstance) return aiInstance;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  if (!GEMINI_API_KEY) {
    throw new Error('❌ Fatal: GEMINI_API_KEY environment variable is missing. Strict Gemini API access is required.');
  }

  aiInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  console.log('✅ Google Gen AI SDK initialized successfully.');
  return aiInstance;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const ai = getAiClient();
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: {
      outputDimensionality: 768,
    }
  });
  
  if (response.embeddings?.[0]?.values) {
    return response.embeddings[0].values;
  }
  throw new Error('No embedding values returned from Gemini API');
}

export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
    }
  });
  return response.text || '';
}

// Streaming generator for Chat UI
export async function* generateTextStream(
  prompt: string, 
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  systemInstruction?: string
): AsyncGenerator<string, void, unknown> {
  const ai = getAiClient();
  
  // Map history to Gemini's expected Content structure
  const contents = history.map(h => ({
    role: h.role,
    parts: h.parts
  }));
  // Append the new prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export async function generateStructuredJson<T>(
  prompt: string, 
  responseSchema: Schema, 
  systemInstruction?: string
): Promise<T> {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    }
  });
  
  const text = response.text || '{}';
  return JSON.parse(text) as T;
}

// Expose standard Schema types for Gemini
export const GeminiSchemaTypes = {
  Type,
};
export type { Schema };
