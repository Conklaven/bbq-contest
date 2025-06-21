import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// You'll need to set up service account credentials
// For now, we'll use the default credentials
admin.initializeApp({
  projectId: 'contest-judger613',
});

const db = admin.firestore();

// Sample data
const SAMPLE_TEAMS = [
  { name: 'Smoke Masters', categories: ['Brisket', 'Ribs', 'Chicken'] },
  { name: 'BBQ Legends', categories: ['Brisket', 'Pork', 'Turkey'] },
  { name: 'Grill Masters', categories: ['Ribs', 'Chicken', 'Sausage'] },
  { name: 'Pit Bosses', categories: ['Brisket', 'Ribs', 'Pork'] },
  { name: 'Smoke & Fire', categories: ['Chicken', 'Turkey', 'Sausage'] },
];

// Generate random 6-character item code
function generateItemCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if item code already exists
async function isItemCodeUnique(itemCode: string): Promise<boolean> {
  const snapshot = await db
    .collection('items')
    .where('itemCode', '==', itemCode)
    .get();
  return snapshot.empty;
}

// Generate unique item code
async function generateUniqueItemCode(): Promise<string> {
  let itemCode: string;
  do {
    itemCode = generateItemCode();
  } while (!(await isItemCodeUnique(itemCode)));
  return itemCode;
}

// Seed teams
async function seedTeams() {
  console.log('Seeding teams...');

  for (const teamData of SAMPLE_TEAMS) {
    const teamRef = db.collection('teams').doc();
    await teamRef.set({
      name: teamData.name,
      categories: teamData.categories,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Created team: ${teamData.name} (ID: ${teamRef.id})`);
  }
}

// Seed items for teams
async function seedItems() {
  console.log('Seeding items...');

  const teamsSnapshot = await db.collection('teams').get();
  const teams = teamsSnapshot.docs;

  for (const teamDoc of teams) {
    const teamData = teamDoc.data();
    const teamId = teamDoc.id;

    // Create items for each category the team participates in
    for (const category of teamData.categories) {
      const itemCode = await generateUniqueItemCode();
      const itemRef = db.collection('items').doc();

      await itemRef.set({
        teamId: teamId,
        category: category,
        itemCode: itemCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Created item: ${category} for ${teamData.name} (Code: ${itemCode})`
      );
    }
  }
}

// Seed judges
async function seedJudges() {
  console.log('Seeding judges...');

  const sampleJudges = [
    { uid: 'judge1', displayName: 'Judge John Smith' },
    { uid: 'judge2', displayName: 'Judge Jane Doe' },
    { uid: 'judge3', displayName: 'Judge Bob Wilson' },
    { uid: 'judge4', displayName: 'Judge Alice Johnson' },
  ];

  for (const judgeData of sampleJudges) {
    await db.collection('judges').doc(judgeData.uid).set({
      displayName: judgeData.displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Created judge: ${judgeData.displayName}`);
  }
}

// Main seed function
async function seed() {
  try {
    console.log('Starting database seed...');

    await seedTeams();
    await seedItems();
    await seedJudges();

    console.log('Database seeding completed successfully!');

    // Print summary
    const teamsCount = (await db.collection('teams').get()).size;
    const itemsCount = (await db.collection('items').get()).size;
    const judgesCount = (await db.collection('judges').get()).size;

    console.log('\nSummary:');
    console.log(`- Teams: ${teamsCount}`);
    console.log(`- Items: ${itemsCount}`);
    console.log(`- Judges: ${judgesCount}`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed().then(() => {
    process.exit(0);
  });
}

export { seed, generateItemCode, generateUniqueItemCode };
