import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';
import { DatabaseServiceAdmin } from '@/lib/db-admin';
import { EmailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, categories } = await request.json();

    console.log('Team creation request received:', {
      name: name ? 'provided' : 'missing',
      email: email ? 'provided' : 'missing',
      password: password ? `${password.length} chars` : 'missing',
      categories: categories ? `${categories.length} items` : 'missing',
    });

    // Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !categories ||
      !Array.isArray(categories)
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, password, categories' },
        { status: 400 }
      );
    }

    // Validate password requirements (Firebase requires minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('Creating Firebase Auth user...');
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });
    console.log('Firebase Auth user created:', userRecord.uid);

    console.log('Setting custom claims...');
    // Set custom claims for team access
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      isAdmin: false,
      isJudge: false,
      isTeam: true,
      teamId: userRecord.uid, // Use the UID as the team ID
    });
    console.log('Custom claims set successfully');

    console.log('Creating team document in Firestore...');
    // Create team document in Firestore
    await DatabaseServiceAdmin.createTeamWithId(userRecord.uid, {
      name,
      email,
      password: '', // Don't store password in Firestore
      categories,
    });
    console.log('Team document created successfully');

    // Send welcome email
    console.log('Sending welcome email...');
    const loginUrl = `${request.nextUrl.origin}/team/login`;
    await EmailService.sendWelcomeEmail({
      teamName: name,
      teamEmail: email,
      categories,
      loginUrl,
    });
    console.log('Welcome email sent successfully');

    return NextResponse.json({
      success: true,
      teamId: userRecord.uid,
      message: 'Team created successfully',
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; stack?: string };
    console.error('Error creating team:', err);
    console.error('Error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack,
    });

    // Handle specific Firebase Auth errors
    if (err.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    if (err.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password is too weak. Please use at least 6 characters.' },
        { status: 400 }
      );
    }

    if (err.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    if (err.code === 'auth/operation-not-allowed') {
      return NextResponse.json(
        { error: 'Email/password accounts are not enabled' },
        { status: 500 }
      );
    }

    // Handle Firestore errors
    if (err.code === 'permission-denied') {
      return NextResponse.json(
        { error: 'Permission denied. Check Firebase security rules.' },
        { status: 500 }
      );
    }

    // Return detailed error for debugging (only in development)
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Failed to create team',
        details: err.message,
        ...(isDevelopment && {
          code: err.code,
          stack: err.stack,
        }),
      },
      { status: 500 }
    );
  }
}
