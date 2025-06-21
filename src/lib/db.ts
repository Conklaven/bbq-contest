import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  DocumentData,
  DocumentSnapshot,
} from 'firebase/firestore';

// Type definitions based on ERD
export interface Team {
  id: string;
  name: string;
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  teamId: string;
  category: string;
  itemCode: string;
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
  taste: number;
  tenderness: number;
  appearance: number;
  createdAt: Date;
  updatedAt: Date;
}

// Collection names
export const COLLECTIONS = {
  TEAMS: 'teams',
  ITEMS: 'items',
  JUDGES: 'judges',
  SCORES: 'scores',
} as const;

// Type converters for Firestore
export const teamConverter = {
  toFirestore: (team: Omit<Team, 'id'>): DocumentData => ({
    name: team.name,
    categories: team.categories,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  }),
  fromFirestore: (snapshot: DocumentSnapshot): Team => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data?.name || '',
      categories: data?.categories || [],
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
  },
};

export const itemConverter = {
  toFirestore: (item: Omit<Item, 'id'>): DocumentData => ({
    teamId: item.teamId,
    category: item.category,
    itemCode: item.itemCode,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }),
  fromFirestore: (snapshot: DocumentSnapshot): Item => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      teamId: data?.teamId || '',
      category: data?.category || '',
      itemCode: data?.itemCode || '',
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
  },
};

export const judgeConverter = {
  toFirestore: (judge: Omit<Judge, 'uid'>): DocumentData => ({
    displayName: judge.displayName,
    createdAt: judge.createdAt,
    updatedAt: judge.updatedAt,
  }),
  fromFirestore: (snapshot: DocumentSnapshot): Judge => {
    const data = snapshot.data();
    return {
      uid: snapshot.id,
      displayName: data?.displayName || '',
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
  },
};

export const scoreConverter = {
  toFirestore: (score: Omit<Score, 'id'>): DocumentData => ({
    itemId: score.itemId,
    judgeId: score.judgeId,
    taste: score.taste,
    tenderness: score.tenderness,
    appearance: score.appearance,
    createdAt: score.createdAt,
    updatedAt: score.updatedAt,
  }),
  fromFirestore: (snapshot: DocumentSnapshot): Score => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      itemId: data?.itemId || '',
      judgeId: data?.judgeId || '',
      taste: data?.taste || 0,
      tenderness: data?.tenderness || 0,
      appearance: data?.appearance || 0,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
  },
};

// Database helper functions
export class DatabaseService {
  // Teams
  static async getTeams(): Promise<Team[]> {
    const teamsRef = collection(db, COLLECTIONS.TEAMS).withConverter(
      teamConverter
    );
    const snapshot = await getDocs(teamsRef);
    return snapshot.docs.map(doc => doc.data());
  }

  static async getTeam(id: string): Promise<Team | null> {
    const teamRef = doc(db, COLLECTIONS.TEAMS, id).withConverter(teamConverter);
    const snapshot = await getDoc(teamRef);
    return snapshot.exists() ? snapshot.data() : null;
  }

  static async createTeam(
    team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const teamsRef = collection(db, COLLECTIONS.TEAMS).withConverter(
      teamConverter
    );
    const now = new Date();
    const docRef = await addDoc(teamsRef, {
      ...team,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  // Items
  static async getItems(): Promise<Item[]> {
    const itemsRef = collection(db, COLLECTIONS.ITEMS).withConverter(
      itemConverter
    );
    const snapshot = await getDocs(itemsRef);
    return snapshot.docs.map(doc => doc.data());
  }

  static async getItemsByTeam(teamId: string): Promise<Item[]> {
    const itemsRef = collection(db, COLLECTIONS.ITEMS).withConverter(
      itemConverter
    );
    const q = query(itemsRef, where('teamId', '==', teamId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  static async getItemByCode(itemCode: string): Promise<Item | null> {
    const itemsRef = collection(db, COLLECTIONS.ITEMS).withConverter(
      itemConverter
    );
    const q = query(itemsRef, where('itemCode', '==', itemCode), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.docs.length > 0 ? snapshot.docs[0].data() : null;
  }

  static async createItem(
    item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const itemsRef = collection(db, COLLECTIONS.ITEMS).withConverter(
      itemConverter
    );
    const now = new Date();
    const docRef = await addDoc(itemsRef, {
      ...item,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  // Judges
  static async getJudges(): Promise<Judge[]> {
    const judgesRef = collection(db, COLLECTIONS.JUDGES).withConverter(
      judgeConverter
    );
    const snapshot = await getDocs(judgesRef);
    return snapshot.docs.map(doc => doc.data());
  }

  static async getJudge(uid: string): Promise<Judge | null> {
    const judgeRef = doc(db, COLLECTIONS.JUDGES, uid).withConverter(
      judgeConverter
    );
    const snapshot = await getDoc(judgeRef);
    return snapshot.exists() ? snapshot.data() : null;
  }

  static async createJudge(
    judge: Omit<Judge, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const judgeRef = doc(db, COLLECTIONS.JUDGES, judge.uid).withConverter(
      judgeConverter
    );
    const now = new Date();
    await setDoc(judgeRef, {
      displayName: judge.displayName,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Scores
  static async getScores(): Promise<Score[]> {
    const scoresRef = collection(db, COLLECTIONS.SCORES).withConverter(
      scoreConverter
    );
    const snapshot = await getDocs(scoresRef);
    return snapshot.docs.map(doc => doc.data());
  }

  static async getScoresByItem(itemId: string): Promise<Score[]> {
    const scoresRef = collection(db, COLLECTIONS.SCORES).withConverter(
      scoreConverter
    );
    const q = query(scoresRef, where('itemId', '==', itemId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  static async getScoresByJudge(judgeId: string): Promise<Score[]> {
    const scoresRef = collection(db, COLLECTIONS.SCORES).withConverter(
      scoreConverter
    );
    const q = query(scoresRef, where('judgeId', '==', judgeId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  static async createScore(
    score: Omit<Score, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const scoresRef = collection(db, COLLECTIONS.SCORES).withConverter(
      scoreConverter
    );
    const now = new Date();
    const docRef = await addDoc(scoresRef, {
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
    const scoreRef = doc(db, COLLECTIONS.SCORES, id).withConverter(
      scoreConverter
    );
    await updateDoc(scoreRef, {
      ...score,
      updatedAt: new Date(),
    });
  }
}
