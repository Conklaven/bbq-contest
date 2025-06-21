import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';

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
