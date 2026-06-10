import { NextRequest, NextResponse } from 'next/server';
import { UserRepository, ConversationRepository, MessageRepository } from '@/lib/repository';

export async function GET(req: NextRequest) {
  try {
    const user = await UserRepository.getOrCreateDefaultUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      // Get a specific conversation message history
      const conversation = await ConversationRepository.get(id);
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      const messages = await MessageRepository.listByConversation(id);
      return NextResponse.json({ conversation, messages });
    } else {
      // List all conversations
      const conversations = await ConversationRepository.list(user.id);
      return NextResponse.json({ conversations });
    }
  } catch (err) {
    console.error('API Error in GET /api/conversations:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Conversation ID is required.' }, { status: 400 });
    }

    await ConversationRepository.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error in DELETE /api/conversations:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
