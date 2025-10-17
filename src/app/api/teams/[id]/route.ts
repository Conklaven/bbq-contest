import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';
import { DatabaseServiceAdmin } from '@/lib/db-admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { name, email, password, categories } = await request.json();

    console.log('Team update request received:', {
      teamId,
      name: name ? 'provided' : 'missing',
      email: email ? 'provided' : 'missing',
      password: password ? `${password.length} chars` : 'missing',
      categories: categories ? `${categories.length} items` : 'missing',
    });

    // Validate required fields (password is optional for updates)
    if (!name || !email || !categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, categories' },
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

    // Validate password if provided (Firebase requires minimum 6 characters)
    if (password && password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Update Firebase Auth user
    const updateData: {
      email: string;
      displayName: string;
      password?: string;
    } = {
      email,
      displayName: name,
    };

    // Only update password if provided
    if (password) {
      updateData.password = password;
    }

    console.log('Updating Firebase Auth user...');
    await admin.auth().updateUser(teamId, updateData);
    console.log('Firebase Auth user updated successfully');

    // Update team document in Firestore
    console.log('Updating team document in Firestore...');
    const firestoreUpdateData: {
      name: string;
      email: string;
      categories: string[];
    } = {
      name,
      email,
      categories,
    };

    // Don't store password in Firestore even if provided
    await DatabaseServiceAdmin.updateTeam(teamId, firestoreUpdateData);
    console.log('Team document updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Team updated successfully',
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; stack?: string };
    console.error('Error updating team:', err);
    console.error('Error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack,
    });

    // Handle specific Firebase Auth errors
    if (err.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

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
        error: 'Failed to update team',
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    console.log('Attempting to delete team:', teamId);

    // Check if Firebase Admin is properly initialized
    console.log('Environment variables check:');
    console.log(
      'FIREBASE_PROJECT_ID:',
      process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET'
    );
    console.log(
      'FIREBASE_CLIENT_EMAIL:',
      process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET'
    );
    console.log(
      'FIREBASE_PRIVATE_KEY:',
      process.env.FIREBASE_PRIVATE_KEY
        ? 'SET (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')'
        : 'NOT SET'
    );

    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PRIVATE_KEY
    ) {
      console.error('Firebase Admin environment variables not configured');
      return NextResponse.json(
        { error: 'Server configuration error - Firebase Admin not configured' },
        { status: 500 }
      );
    }

    // Test Firebase Admin initialization
    try {
      admin.auth();
      console.log('Firebase Admin Auth initialized successfully');
    } catch (initError: unknown) {
      const error = initError as Error;
      console.error('Error initializing Firebase Admin:', error);
      return NextResponse.json(
        { error: 'Firebase Admin initialization failed: ' + error.message },
        { status: 500 }
      );
    }

    // Delete Firebase Auth user
    try {
      await admin.auth().deleteUser(teamId);
      console.log('Firebase Auth user deleted successfully');
    } catch (authError: unknown) {
      const error = authError as { code?: string };
      console.error('Error deleting Firebase Auth user:', error);
      if (error.code === 'auth/user-not-found') {
        console.log(
          'User not found in Firebase Auth, continuing with Firestore deletion'
        );
      } else {
        throw error;
      }
    }

    // Delete team document from Firestore using Admin SDK
    try {
      const firestore = admin.firestore();
      await firestore.collection('teams').doc(teamId).delete();
      console.log('Team document deleted from Firestore successfully');
    } catch (firestoreError: unknown) {
      const error = firestoreError as Error;
      console.error('Error deleting team from Firestore:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; stack?: string };
    console.error('Error deleting team:', err);
    console.error('Error stack:', err.stack);

    if (err.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to delete team: ' + (err.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
