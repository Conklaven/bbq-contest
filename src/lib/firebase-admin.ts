import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const apps = getApps();

if (!apps.length) {
  // Check if we have environment variables (preferred for production)
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Fallback to service account key file (local development only)
    try {
      const serviceAccountPath = path.join(
        process.cwd(),
        'serviceAccountKey.json'
      );
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf8')
        );
        initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        throw new Error(
          'No Firebase credentials found. Please set environment variables or add serviceAccountKey.json'
        );
      }
    } catch (error) {
      console.error('Error loading Firebase credentials:', error);
      throw new Error(
        'Failed to initialize Firebase Admin SDK. Please check your credentials.'
      );
    }
  }
}

export const admin = {
  auth: () => getAuth(),
  firestore: () => getFirestore(),
};
