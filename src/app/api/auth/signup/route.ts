import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/lib/repository';
import { hashPassword, encrypt, signSession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, customDbUri } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await UserRepository.getByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered.' }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = hashPassword(password);

    // Encrypt the connection string if provided
    let encryptedDbUri = undefined;
    if (customDbUri && customDbUri.trim()) {
      encryptedDbUri = encrypt(customDbUri.trim());
    }

    // Create user in global DB
    const user = await UserRepository.create({
      name,
      email,
      password: hashedPassword,
      customDbUri: encryptedDbUri,
    });

    // Generate session token
    const sessionToken = signSession({
      userId: user.id,
      email: user.email,
      customDbUri: encryptedDbUri || null,
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
        hasCustomDb: !!encryptedDbUri,
      },
    });

  } catch (error: any) {
    console.error('[Signup API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed.' },
      { status: 500 }
    );
  }
}
