import { admin } from './firebase-admin';

// Type definitions based on ERD
export interface Team {
  id: string;
  name: string;
  email: string;
  password: string;
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  teamId: string;
  category: string;
  itemCode: string;
  judgingCriteria: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Judge {
  uid: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Score {
  id: string;
  itemId: string;
  judgeId: string;
  scores: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContestSettings {
  id: string;
  contestName: string;
  contestDate: string;
  maxScorePerCategory: number;
  categories: string[];
  judgingCriteria: string[];
  categoryJudgingCriteria: Record<string, string[]>;
  judgingPassword?: string;
  scoresVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Collection names
export const COLLECTIONS = {
  TEAMS: 'teams',
  ITEMS: 'items',
  JUDGES: 'judges',
  SCORES: 'scores',
  SETTINGS: 'settings',
} as const;

// Database helper functions using Admin SDK
export class DatabaseServiceAdmin {
  private static db = admin.firestore();

  // Teams
  static async getTeams(): Promise<Team[]> {
    const teamsRef = this.db.collection(COLLECTIONS.TEAMS);
    const snapshot = await teamsRef.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Team[];
  }

  static async getTeam(id: string): Promise<Team | null> {
    const teamRef = this.db.collection(COLLECTIONS.TEAMS).doc(id);
    const snapshot = await teamRef.get();
    if (!snapshot.exists) return null;

    const data = snapshot.data()!;
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Team;
  }

  static async createTeam(
    team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const teamsRef = this.db.collection(COLLECTIONS.TEAMS);
    const now = new Date();
    const docRef = await teamsRef.add({
      ...team,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  static async createTeamWithId(
    id: string,
    team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const teamRef = this.db.collection(COLLECTIONS.TEAMS).doc(id);
    const now = new Date();
    await teamRef.set({
      ...team,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  static async updateTeam(
    id: string,
    team: Partial<Omit<Team, 'id' | 'createdAt'>>
  ): Promise<void> {
    const teamRef = this.db.collection(COLLECTIONS.TEAMS).doc(id);
    await teamRef.update({
      ...team,
      updatedAt: new Date(),
    });
  }

  static async deleteTeam(id: string): Promise<void> {
    const teamRef = this.db.collection(COLLECTIONS.TEAMS).doc(id);
    await teamRef.delete();
  }

  // Items
  static async getItems(): Promise<Item[]> {
    const itemsRef = this.db.collection(COLLECTIONS.ITEMS);
    const snapshot = await itemsRef.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Item[];
  }

  static async getItemsByTeam(teamId: string): Promise<Item[]> {
    // First get the team to retrieve their registered categories
    const team = await this.getTeam(teamId);
    if (!team) {
      return [];
    }

    const itemsRef = this.db.collection(COLLECTIONS.ITEMS);
    const q = itemsRef.where('teamId', '==', teamId);
    const snapshot = await q.get();
    const allItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Item[];

    // Filter items to only include categories the team is signed up for
    return allItems.filter(item => team.categories.includes(item.category));
  }

  static async getItemByCode(itemCode: string): Promise<Item | null> {
    const itemsRef = this.db.collection(COLLECTIONS.ITEMS);
    const q = itemsRef.where('itemCode', '==', itemCode).limit(1);
    const snapshot = await q.get();
    if (snapshot.docs.length === 0) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Item;
  }

  static async createItem(
    item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const itemsRef = this.db.collection(COLLECTIONS.ITEMS);
    const now = new Date();
    const docRef = await itemsRef.add({
      ...item,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  static async updateItem(
    id: string,
    item: Partial<Omit<Item, 'id' | 'createdAt'>>
  ): Promise<void> {
    const itemRef = this.db.collection(COLLECTIONS.ITEMS).doc(id);
    await itemRef.update({
      ...item,
      updatedAt: new Date(),
    });
  }

  // Judges
  static async getJudges(): Promise<Judge[]> {
    const judgesRef = this.db.collection(COLLECTIONS.JUDGES);
    const snapshot = await judgesRef.get();
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Judge[];
  }

  static async getJudge(uid: string): Promise<Judge | null> {
    const judgeRef = this.db.collection(COLLECTIONS.JUDGES).doc(uid);
    const snapshot = await judgeRef.get();
    if (!snapshot.exists) return null;

    const data = snapshot.data()!;
    return {
      uid: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Judge;
  }

  static async createJudge(
    judge: Omit<Judge, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const judgeRef = this.db.collection(COLLECTIONS.JUDGES).doc(judge.uid);
    const now = new Date();
    await judgeRef.set({
      displayName: judge.displayName,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Scores
  static async getScores(): Promise<Score[]> {
    const scoresRef = this.db.collection(COLLECTIONS.SCORES);
    const snapshot = await scoresRef.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Score[];
  }

  static async getScoresByItem(itemId: string): Promise<Score[]> {
    const scoresRef = this.db.collection(COLLECTIONS.SCORES);
    const q = scoresRef.where('itemId', '==', itemId);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Score[];
  }

  static async getScoresByJudge(judgeId: string): Promise<Score[]> {
    const scoresRef = this.db.collection(COLLECTIONS.SCORES);
    const q = scoresRef.where('judgeId', '==', judgeId);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Score[];
  }

  static async createScore(
    score: Omit<Score, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const scoresRef = this.db.collection(COLLECTIONS.SCORES);
    const now = new Date();
    const docRef = await scoresRef.add({
      ...score,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  static async updateScore(
    id: string,
    score: Partial<Omit<Score, 'id' | 'createdAt'>>
  ): Promise<void> {
    const scoreRef = this.db.collection(COLLECTIONS.SCORES).doc(id);
    await scoreRef.update({
      ...score,
      updatedAt: new Date(),
    });
  }

  // Settings
  static async getSettings(): Promise<ContestSettings | null> {
    const settingsRef = this.db.collection(COLLECTIONS.SETTINGS);
    const snapshot = await settingsRef.get();
    if (snapshot.docs.length === 0) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as ContestSettings;
  }

  static async saveSettings(
    settings: Omit<ContestSettings, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const settingsRef = this.db.collection(COLLECTIONS.SETTINGS);
    const snapshot = await settingsRef.get();

    if (snapshot.docs.length > 0) {
      // Update existing settings
      const docRef = settingsRef.doc(snapshot.docs[0].id);
      await docRef.update({
        ...settings,
        updatedAt: new Date(),
      });
    } else {
      // Create new settings
      const now = new Date();
      await settingsRef.add({
        ...settings,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
