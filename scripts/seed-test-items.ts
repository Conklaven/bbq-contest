import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const db = admin.firestore();

async function seedTestItems() {
  try {
    console.log('Seeding test items...');

    // Create test items
    const testItems = [
      {
        teamId: 'test-team-1',
        category: 'Brisket',
        itemCode: 'TEST001',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        teamId: 'test-team-2',
        category: 'Ribs',
        itemCode: 'TEST002',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        teamId: 'test-team-3',
        category: 'Chicken',
        itemCode: 'TEST003',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        teamId: 'test-team-4',
        category: 'Pork',
        itemCode: 'TEST004',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const item of testItems) {
      try {
        // Check if item already exists
        const existingItems = await db
          .collection('items')
          .where('itemCode', '==', item.itemCode)
          .get();

        if (existingItems.empty) {
          await db.collection('items').add(item);
          console.log(`Created item: ${item.itemCode} (${item.category})`);
        } else {
          console.log(`Item ${item.itemCode} already exists, skipping...`);
        }
      } catch (error) {
        console.log(`Error with item ${item.itemCode}:`, error);
      }
    }

    console.log('Test items seeded successfully!');
    console.log('\nYou can now test the judge functionality:');
    console.log('1. Go to /judge/signin to sign in as a judge');
    console.log('2. Go to /judge/test to generate QR codes');
    console.log('3. Scan the QR codes with the judge scanner');
  } catch (error) {
    console.error('Error seeding test items:', error);
  } finally {
    process.exit(0);
  }
}

seedTestItems();
