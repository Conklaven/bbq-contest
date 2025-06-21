import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';
import { DatabaseServiceAdmin } from '@/lib/db-admin';
import { EmailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, categories } = await request.json();

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

    if (err.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create team', details: err.message },
      { status: 500 }
    );
  }
}
