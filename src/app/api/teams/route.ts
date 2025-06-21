import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';
import { DatabaseService } from '@/lib/db';

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

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Set custom claims for team access
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      isAdmin: false,
      isJudge: false,
      isTeam: true,
      teamId: userRecord.uid, // Use the UID as the team ID
    });

    // Create team document in Firestore
    await DatabaseService.createTeamWithId(userRecord.uid, {
      name,
      email,
      password: '', // Don't store password in Firestore
      categories,
    });

    return NextResponse.json({
      success: true,
      teamId: userRecord.uid,
      message: 'Team created successfully',
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('Error creating team:', err);

    if (err.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
