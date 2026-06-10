import { NextResponse } from 'next/server';
import { UserRepository, DbConsoleRepository } from '@/lib/repository';

export async function GET() {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const stats = await DbConsoleRepository.getStats(user.id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('API Error in GET /api/db-status:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
