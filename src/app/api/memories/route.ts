import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, MemoryRepository } from '@/lib/repository';
import { getEmbedding } from '@/lib/gemini';

export async function GET(req: NextRequest) {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (query) {
      // Perform vector search on memories
      const embedding = await getEmbedding(query);
      const searchResults = await MemoryRepository.vectorSearch(user.id, embedding, 10);
      return NextResponse.json({ memories: searchResults });
    } else {
      // List all memories
      const memories = await MemoryRepository.list(user.id);
      return NextResponse.json({ memories });
    }
  } catch (err) {
    console.error('API Error in GET /api/memories:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Memory ID is required.' }, { status: 400 });
    }

    await MemoryRepository.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error in DELETE /api/memories:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
