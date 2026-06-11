import { EXERCISE_DATABASE, MuscleGroup } from './exercises';

export interface SuggestedDay {
  name: { en: string; es: string };
  exercises: Array<{ exerciseId: string; sets: number; reps: number; restSecs: number }>;
}

const PUSH: MuscleGroup[] = ['Chest', 'Upper Chest', 'Front Delts', 'Lateral Delts', 'Triceps'];
const PULL: MuscleGroup[] = ['Lats', 'Upper Back', 'Lower Back', 'Traps', 'Rear Delts', 'Biceps', 'Forearms'];
const LEGS: MuscleGroup[] = ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors'];
const CORE: MuscleGroup[] = ['Abs', 'Obliques'];

function pickExercises(category: MuscleGroup[], goals: MuscleGroup[], count: number) {
  const priority = EXERCISE_DATABASE.filter(ex => category.includes(ex.primaryMuscle) && goals.includes(ex.primaryMuscle));
  const rest = EXERCISE_DATABASE.filter(ex => category.includes(ex.primaryMuscle) && !goals.includes(ex.primaryMuscle));
  return [...priority, ...rest].slice(0, count).map(ex => ({ exerciseId: ex.id, sets: 4, reps: 10, restSecs: 90 }));
}

export function generateSuggestedRoutine(goals: MuscleGroup[], daysCount: number = 3): SuggestedDay[] {
  const effective = goals.length > 0 ? goals : ([...PUSH, ...PULL, ...LEGS, ...CORE] as MuscleGroup[]);
  const days: SuggestedDay[] = [];

  const createDay = (nameEn: string, nameEs: string, primary: MuscleGroup[], secondary: MuscleGroup[] = []) => {
    const exs = pickExercises(primary, effective, 4);
    if (secondary.length > 0) exs.push(...pickExercises(secondary, effective, 2));
    return { name: { en: nameEn, es: nameEs }, exercises: exs };
  };

  if (daysCount === 1) {
    days.push(createDay('Full Body', 'Cuerpo Completo', [...PUSH, ...PULL, ...LEGS, ...CORE]));
  } else if (daysCount === 2) {
    days.push(createDay('Upper Body', 'Tren Superior', [...PUSH, ...PULL]));
    days.push(createDay('Lower Body', 'Tren Inferior', [...LEGS, ...CORE]));
  } else if (daysCount === 3) {
    days.push(createDay('Push', 'Empuje', PUSH));
    days.push(createDay('Pull', 'Tirón', PULL));
    days.push(createDay('Legs', 'Piernas', LEGS, CORE));
  } else if (daysCount === 4) {
    days.push(createDay('Upper Body', 'Tren Superior', [...PUSH, ...PULL]));
    days.push(createDay('Lower Body', 'Tren Inferior', LEGS, CORE));
    days.push(createDay('Push & Pull', 'Empuje y Tirón', [...PUSH, ...PULL]));
    days.push(createDay('Legs & Core', 'Piernas y Core', LEGS, CORE));
  } else if (daysCount === 5) {
    days.push(createDay('Push', 'Empuje', PUSH));
    days.push(createDay('Pull', 'Tirón', PULL));
    days.push(createDay('Legs', 'Piernas', LEGS));
    days.push(createDay('Upper', 'Tren Superior', [...PUSH, ...PULL]));
    days.push(createDay('Lower & Core', 'Tren Inferior y Core', LEGS, CORE));
  } else {
    days.push(createDay('Push', 'Empuje', PUSH));
    days.push(createDay('Pull', 'Tirón', PULL));
    days.push(createDay('Legs', 'Piernas', LEGS));
    days.push(createDay('Push', 'Empuje', PUSH));
    days.push(createDay('Pull', 'Tirón', PULL));
    days.push(createDay('Legs & Core', 'Piernas y Core', LEGS, CORE));
  }

  // Slice down to exact requested days (just in case)
  return days.slice(0, daysCount);
}

const MUSCLE_NAMES_ES: Partial<Record<MuscleGroup, string>> = {
  Chest: "Pecho", "Upper Chest": "Pecho Superior", Lats: "Dorsales",
  "Upper Back": "Espalda Alta", "Lower Back": "Lumbar", Traps: "Trapecio",
  "Front Delts": "Deltoides Anterior", "Lateral Delts": "Deltoides Lateral",
  "Rear Delts": "Deltoides Posterior", Biceps: "Bíceps", Triceps: "Tríceps",
  Forearms: "Antebrazos", Quads: "Cuádriceps", Hamstrings: "Isquiosurales",
  Glutes: "Glúteos", Calves: "Gemelos", Abs: "Abdominales", Obliques: "Oblicuos",
  Adductors: "Aductores", Serratus: "Serrato",
};

function getMuscleLabel(muscle: MuscleGroup, lang: "en" | "es") {
  return lang === "es" ? (MUSCLE_NAMES_ES[muscle] ?? muscle) : muscle;
}

export function getPersonalizedSuggestions(
  totalSetsPerMuscle: Partial<Record<MuscleGroup, number>>,
  goals: MuscleGroup[],
  lang: "en" | "es"
): string[] {
  const suggestions: string[] = [];
  
  // En/Es translations inline for simplicity
  const texts = {
    goalLow: { en: "You want to improve {m}, but you only have {s} sets. Try to reach at least 12-15 sets.", es: "Querés mejorar {m}, pero solo tenés {s} series. Intentá llegar a 12-15 series." },
    goalGood: { en: "Great job! {m} is prioritized with {s} sets.", es: "¡Bien ahí! {m} está priorizado con {s} series." },
  };

  const getM = (m: MuscleGroup) => getMuscleLabel(m, lang);

  goals.forEach(m => {
    const s = totalSetsPerMuscle[m] || 0;
    if (s < 12) suggestions.push(texts.goalLow[lang].replace('{m}', getM(m)).replace('{s}', s.toString()));
    else suggestions.push(texts.goalGood[lang].replace('{m}', getM(m)).replace('{s}', s.toString()));
  });

  return suggestions;
}
