import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json' with { type: 'json' };

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function createAdminUser(email, password, displayName) {
  try {
    // Create user with email/password
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
    });

    console.log('✅ User created successfully:', userRecord.uid);

    // Set custom claims for admin access
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      isAdmin: true,
      isJudge: true,
      isTeam: false,
    });

    console.log('✅ Admin claims set successfully');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🆔 UID:', userRecord.uid);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  User already exists, updating claims...');

      // Get user by email
      const userRecord = await admin.auth().getUserByEmail(email);

      // Update claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        isAdmin: true,
        isJudge: true,
        isTeam: false,
      });

      console.log('✅ Admin claims updated successfully');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);
      console.log('🆔 UID:', userRecord.uid);
    } else {
      console.error('❌ Error creating admin user:', error);
    }
  }

  process.exit(0);
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: node seed-admin.js <email> <password> <displayName>');
  console.log(
    'Example: node seed-admin.js admin@example.com "SecurePass123!" "Admin User"'
  );
  process.exit(1);
}

const [email, password, displayName] = args;
createAdminUser(email, password, displayName);
