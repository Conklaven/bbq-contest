import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function createAdminUser() {
  try {
    // Create user with email/password
    const userRecord = await admin.auth().createUser({
      email: 'jacob.klaven@gmail.com',
      password: 'Tamara6!3',
      displayName: 'Jacob Klaven - BBQ Contest Admin',
    });

    console.log('✅ User created successfully:', userRecord.uid);

    // Set custom claims for admin access
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      isAdmin: true,
      isJudge: true,
      isTeam: false,
    });

    console.log('✅ Admin claims set successfully');
    console.log('📧 Email: jacob.klaven@gmail.com');
    console.log('🔑 Password: Tamara6!3');
    console.log('🆔 UID:', userRecord.uid);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  User already exists, updating claims...');

      // Get user by email
      const userRecord = await admin
        .auth()
        .getUserByEmail('jacob.klaven@gmail.com');

      // Update claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        isAdmin: true,
        isJudge: true,
        isTeam: false,
      });

      console.log('✅ Admin claims updated successfully');
      console.log('📧 Email: jacob.klaven@gmail.com');
      console.log('🔑 Password: Tamara6!3');
      console.log('🆔 UID:', userRecord.uid);
    } else {
      console.error('❌ Error creating admin user:', error);
    }
  }

  process.exit(0);
}

createAdminUser();
