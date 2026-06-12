import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/lib/repository';
import { verifyPassword, signSession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Fetch user
    const user = await UserRepository.getByEmail(email);
    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Generate session token
    const sessionToken = signSession({
      userId: user.id,
      email: user.email,
      customDbUri: user.customDbUri || null,
    });

    // Set cookie
    const cookieStore = await cookies();
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
        id: user.id,
        name: user.name,
        email: user.email,
        hasCustomDb: !!user.customDbUri,
      },
    });

  } catch (error: any) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}
