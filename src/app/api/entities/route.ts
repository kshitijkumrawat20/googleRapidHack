import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, EntityRepository } from '@/lib/repository';

export async function GET() {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const entities = await EntityRepository.list(user.id);
    return NextResponse.json({ entities });
  } catch (err) {
    console.error('API Error in GET /api/entities:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entity ID is required.' }, { status: 400 });
    }

    await EntityRepository.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error in DELETE /api/entities:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
