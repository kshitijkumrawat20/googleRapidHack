import { NextResponse } from 'next/server';
import { UserRepository, RelationshipRepository } from '@/lib/repository';

export async function GET() {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const relationships = await RelationshipRepository.list(user.id);
    return NextResponse.json({ relationships });
  } catch (err) {
    console.error('API Error in GET /api/relationships:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
