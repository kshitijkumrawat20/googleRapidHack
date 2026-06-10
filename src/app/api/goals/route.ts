import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, GoalRepository } from '@/lib/repository';

export async function GET() {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const goals = await GoalRepository.list(user.id);
    return NextResponse.json({ goals });
  } catch (err) {
    console.error('API Error in GET /api/goals:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const { title, description, targetDate } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const goal = await GoalRepository.create({
      userId: user.id,
      title,
      description: description || '',
      status: 'active',
      progress: 0,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      linkedMemoryIds: []
    });

    return NextResponse.json({ goal });
  } catch (err) {
    console.error('API Error in POST /api/goals:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, progress, status, title, description } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required.' }, { status: 400 });
    }

    const updates: any = {};
    if (progress !== undefined) updates.progress = progress;
    if (status) updates.status = status;
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;

    await GoalRepository.update(id, updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error in PATCH /api/goals:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required.' }, { status: 400 });
    }

    await GoalRepository.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error in DELETE /api/goals:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
