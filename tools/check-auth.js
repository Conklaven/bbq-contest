import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function checkAuthProviders() {
  try {
    console.log('Checking Firebase Authentication providers...');

    // Get the project ID from service account
    const projectId = serviceAccount.project_id;
    console.log(`Project ID: ${projectId}`);

    // Note: Firebase Admin SDK doesn't have direct access to check auth providers
    // This would need to be done through the Firebase Console or REST API

    console.log('\n=== ANONYMOUS AUTHENTICATION SETUP ===');
    console.log('To enable anonymous authentication:');
    console.log('1. Go to https://console.firebase.google.com/');
    console.log(`2. Select your project: ${projectId}`);
    console.log('3. Navigate to Authentication > Sign-in method');
    console.log('4. Find "Anonymous" in the list of providers');
    console.log('5. Click on "Anonymous" and enable it');
    console.log('6. Save the changes');
    console.log(
      '\nAfter enabling anonymous auth, the judge sign-in should work!'
    );
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAuthProviders();
