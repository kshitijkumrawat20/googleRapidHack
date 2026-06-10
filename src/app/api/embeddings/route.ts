import { NextResponse } from 'next/server';
import { UserRepository, EmbeddingRepository } from '@/lib/repository';

export async function GET() {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const embeddings = await EmbeddingRepository.list(user.id);
    return NextResponse.json({ embeddings });
  } catch (err) {
    console.error('API Error in GET /api/embeddings:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
