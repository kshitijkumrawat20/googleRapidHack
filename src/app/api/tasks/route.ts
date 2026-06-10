import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, TaskRepository } from '@/lib/repository';

export async function GET() {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const tasks = await TaskRepository.list(user.id);
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error('API Error in GET /api/tasks:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const { title, linkedGoalId, dueDate } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const task = await TaskRepository.create({
      userId: user.id,
      title,
      status: 'pending',
      linkedGoalId,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    return NextResponse.json({ task });
  } catch (err) {
    console.error('API Error in POST /api/tasks:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Task ID and status are required.' }, { status: 400 });
    }

    await TaskRepository.updateStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error in PATCH /api/tasks:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    await TaskRepository.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error in DELETE /api/tasks:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
