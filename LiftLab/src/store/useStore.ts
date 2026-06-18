import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ExerciseDef, MuscleGroup } from '@/lib/exercises';
import { Language } from '@/lib/i18n';

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  restSecs: number;
  customName?: string;
  primaryMuscleOverride?: MuscleGroup;
  secondaryMusclesOverride?: MuscleGroup[];
  categoryOverride?: 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Smith Machine' | 'Cardio' | 'Soft Cardio' | 'Moderate Cardio' | 'Intense Cardio' | 'Plyometrics';
  weightKg?: number;
}

export interface WorkoutDay {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface LoggedSet {
  reps: number;
  weightKg: number;
  completed: boolean;
}

export interface LoggedExercise {
  exerciseId: string;
  plannedSets: number;
  plannedReps: number;
  loggedSets: LoggedSet[];
}

export interface WorkoutSession {
  id: string;
  dayId: string;
  dayName: string;
  date: string;
  durationSecs: number;
  exercises: LoggedExercise[];
  efficiencyScore: number;
}

export interface ActiveSession {
  dayId: string;
  dayName: string;
  startTime: string;
  exercises: LoggedExercise[];
  elapsedSecs: number;
}

export interface UserProfile {
  strengths: MuscleGroup[];
  goals: MuscleGroup[];
  createdAt: string;
  lastReviewAt: string;
  // New nutritional fields
  trainingHoursWeekly?: number;
  trainingObjective?: 'hypertrophy' | 'strength' | 'endurance';
  proteinPreferenceGPerKg?: number;

  heightCm?: number;
  weightKg?: number;
  targetMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goal: 'cutting' | 'maintenance' | 'bulking';
    goalLabel: { en: string; es: string };
  };
  age?: number;
  gender?: 'male' | 'female';
  lastWeightUpdateAt?: string;
  weightHistory?: Array<{ date: string; weightKg: number }>;
}

interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;

  weightUnit: 'kg' | 'lbs';
  setWeightUnit: (unit: 'kg' | 'lbs') => void;

  distanceUnit: 'km' | 'mi';
  setDistanceUnit: (unit: 'km' | 'mi') => void;

  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;

  customExercises: ExerciseDef[];
  addCustomExercise: (ex: ExerciseDef) => void;
  updateCustomExerciseDef: (exId: string, updates: Partial<Pick<ExerciseDef, 'name' | 'primaryMuscle' | 'secondaryMuscles' | 'category' | 'grip'>>) => void;
  updateExercisesByExerciseId: (exerciseId: string, updates: Partial<Pick<RoutineExercise, 'customName' | 'primaryMuscleOverride' | 'secondaryMusclesOverride' | 'categoryOverride'>>) => void;

  days: WorkoutDay[];
  addDay: (name: string, exercises?: Omit<RoutineExercise, 'id'>[]) => void;
  updateDayName: (dayId: string, newName: string) => void;
  removeDay: (dayId: string) => void;
  addExerciseToDay: (dayId: string, exercise: Omit<RoutineExercise, 'id'>) => void;
  updateExerciseInDay: (dayId: string, exerciseId: string, updates: Partial<RoutineExercise>) => void;
  updateExerciseGlobal: (exerciseId: string, updates: Partial<RoutineExercise>) => void;
  reorderExerciseInDay: (dayId: string, oldIndex: number, newIndex: number) => void;
  removeExerciseFromDay: (dayId: string, exerciseId: string) => void;
  removeExerciseGlobal: (exerciseId: string) => void;
  loadSuggestedDays: (days: WorkoutDay[]) => void;

  activeSession: ActiveSession | null;
  setActiveSession: (session: ActiveSession | null) => void;
  loadAllState: (data: Partial<Pick<AppState, 'language' | 'weightUnit' | 'distanceUnit' | 'profile' | 'days' | 'customExercises' | 'workoutHistory'>>) => void;

  workoutHistory: WorkoutSession[];
  saveWorkoutSession: (session: WorkoutSession) => void;
  deleteWorkoutSession: (sessionId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),

      weightUnit: 'kg',
      setWeightUnit: (unit) => set({ weightUnit: unit }),

      distanceUnit: 'km',
      setDistanceUnit: (unit) => set({ distanceUnit: unit }),

      profile: null,
      setProfile: (profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),

      customExercises: [],
      addCustomExercise: (ex) => set((state) => ({ customExercises: [...(state.customExercises || []), ex] })),

      /** Edita la definición de un ejercicio personalizado en customExercises */
      updateCustomExerciseDef: (exId, updates) => set((state) => ({
        customExercises: (state.customExercises || []).map((ex) =>
          ex.id === exId ? { ...ex, ...updates } : ex
        ),
      })),

      /** Propaga cambios de overrides a TODAS las instancias del mismo exerciseId en todos los días */
      updateExercisesByExerciseId: (exerciseId, updates) => set((state) => ({
        days: (state.days || []).map((day) => ({
          ...day,
          exercises: (day.exercises || []).map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            const merged = { ...ex, ...updates };
            // Eliminar explícitamente las claves con valor undefined
            // para que los fallbacks con || funcionen correctamente
            (Object.keys(merged) as Array<keyof typeof merged>).forEach((k) => {
              if (merged[k] === undefined) delete merged[k];
            });
            return merged;
          }),
        })),
      })),

      days: [],
      addDay: (name, exercises) => set((state) => ({
        days: [...(state.days || []), {
          id: Date.now().toString(),
          name,
          exercises: exercises ? exercises.map(ex => ({ ...ex, id: Date.now().toString() + Math.random() })) : []
        }]
      })),

      updateDayName: (dayId, newName) => set((state) => ({
        days: (state.days || []).map((day) => day.id === dayId ? { ...day, name: newName } : day)
      })),

      removeDay: (dayId) => set((state) => ({
        days: (state.days || []).filter((day) => day.id !== dayId)
      })),

      addExerciseToDay: (dayId, exercise) => set((state) => ({
        days: (state.days || []).map((day) => {
          if (day.id === dayId) {
            return { ...day, exercises: [...(day.exercises || []), { ...exercise, id: Date.now().toString() + Math.random() }] };
          }
          return day;
        })
      })),

      reorderExerciseInDay: (dayId, oldIndex, newIndex) => set((state) => ({
        days: (state.days || []).map((day) => {
          if (day.id !== dayId) return day;
          const newExercises = [...day.exercises];
          const [removed] = newExercises.splice(oldIndex, 1);
          newExercises.splice(newIndex, 0, removed);
          return { ...day, exercises: newExercises };
        })
      })),

      activeSession: null,
      setActiveSession: (session) => set({ activeSession: session }),

      /** Actualiza un ejercicio SOLO en un día */
      updateExerciseInDay: (dayId, exerciseId, updates) => set((state) => ({
        days: (state.days || []).map((day) => {
          if (day.id === dayId) {
            return { ...day, exercises: (day.exercises || []).map((ex) => ex.id === exerciseId ? { ...ex, ...updates } : ex) };
          }
          return day;
        })
      })),

      /** Actualiza TODAS las instancias de un ejercicio en TODOS los días */
      updateExerciseGlobal: (exerciseId, updates) => set((state) => ({
        days: (state.days || []).map((day) => ({
          ...day,
          exercises: (day.exercises || []).map((ex) => ex.id === exerciseId ? { ...ex, ...updates } : ex),
        })),
      })),

      /** Elimina un ejercicio de un día en particular */
      removeExerciseFromDay: (dayId, exerciseId) => set((state) => ({
        days: (state.days || []).map((day) => {
          if (day.id === dayId) {
            return { ...day, exercises: (day.exercises || []).filter((ex) => ex.id !== exerciseId) };
          }
          return day;
        })
      })),

      /** Elimina un ejercicio de TODOS los días */
      removeExerciseGlobal: (exerciseId) => set((state) => ({
        days: (state.days || []).map((day) => ({
          ...day,
          exercises: (day.exercises || []).filter((ex) => ex.id !== exerciseId),
        })),
      })),

      loadSuggestedDays: (days) => set({ days: days || [] }),
      loadAllState: (data) => set({
        language: data?.language || 'en',
        weightUnit: data?.weightUnit || 'kg',
        distanceUnit: data?.distanceUnit || 'km',
        profile: data?.profile || null,
        days: data?.days || [],
        customExercises: data?.customExercises || [],
        workoutHistory: data?.workoutHistory || [],
      }),

      workoutHistory: [],
      saveWorkoutSession: (session) => set((state) => ({ workoutHistory: [session, ...(state.workoutHistory || [])] })),
      deleteWorkoutSession: (sessionId) => set((state) => ({
        workoutHistory: (state.workoutHistory || []).filter(s => s.id !== sessionId)
      })),
    }),
    { name: 'liftlab-storage' }
  )
);
