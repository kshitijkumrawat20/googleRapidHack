import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, encrypt, signSession } from '@/lib/auth-utils';
import { UserRepository } from '@/lib/repository';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

function toMongoId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw new Error('Invalid ObjectId format');
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('memoria_session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const session = verifySession(sessionCookie.value);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const user = await UserRepository.getByEmail(session.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasCustomDb: !!user.customDbUri,
      },
    });

  } catch (error: any) {
    console.error('[Me API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('memoria_session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const session = verifySession(sessionCookie.value);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const { customDbUri } = await req.json();

    // Encrypt the connection string
    let encryptedDbUri = null;
    if (customDbUri && customDbUri.trim()) {
      encryptedDbUri = encrypt(customDbUri.trim());
    }

    // Update customDbUri in the global database
    const conn = await connectToDatabase();
    await conn.db.collection('users').updateOne(
      { _id: toMongoId(session.userId) },
      { $set: { customDbUri: encryptedDbUri } }
    );

    // Re-sign session payload with updated connection string
    const sessionToken = signSession({
      userId: session.userId,
      email: session.email,
      customDbUri: encryptedDbUri,
    });

    // Reset cookie
    cookieStore.set('memoria_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: session.userId,
        email: session.email,
        hasCustomDb: !!encryptedDbUri,
      },
    });

  } catch (error: any) {
    console.error('[Update DB URI API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update database settings.' },
      { status: 500 }
    );
  }
}
