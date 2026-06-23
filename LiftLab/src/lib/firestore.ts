import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, WorkoutDay, WorkoutSession } from '@/store/useStore';
import { ExerciseDef } from './exercises';

export interface FirestoreUserData {
  language: string;
  weightUnit?: 'kg' | 'lbs';
  distanceUnit?: 'km' | 'mi';
  profile: UserProfile | null;
  days: WorkoutDay[];
  customExercises: ExerciseDef[];
  workoutHistory: WorkoutSession[];
}

/**
 * Firestore no admite `undefined` como valor de campo.
 * Esta función elimina recursivamente todas las claves con valor undefined
 * antes de escribir en la base de datos.
 */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    ) as T;
  }
  return obj;
}

export async function loadUserData(uid: string): Promise<FirestoreUserData | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as FirestoreUserData) : null;
  } catch (e) {
    console.error('Firestore load error:', e);
    return null;
  }
}

export async function saveUserData(uid: string, data: Partial<FirestoreUserData>) {
  try {
    await setDoc(doc(db, 'users', uid), stripUndefined(data), { merge: true });
  } catch (e) {
    console.error('Firestore save error:', e);
  }
}
