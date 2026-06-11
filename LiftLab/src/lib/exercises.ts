export type MuscleGroup = 
  | 'Adductors' | 'Chest' | 'Upper Chest' 
  | 'Lats' | 'Upper Back' | 'Lower Back' | 'Traps'
  | 'Front Delts' | 'Lateral Delts' | 'Rear Delts' | 'Serratus'
  | 'Biceps' | 'Triceps' | 'Forearms'
  | 'Quads' | 'Hamstrings' | 'Glutes' | 'Calves' 
  | 'Abs' | 'Obliques'
  | 'Neck' | 'Cardio'
  | 'Tibialis' | 'Brachialis' | 'Psoas';

export type GripType = 'Pronated' | 'Supinated' | 'Neutral' | 'Mixed' | 'Wide' | 'Close' | 'Any';

export interface ExerciseDef {
  id: string;
  name: Record<'en' | 'es', string> | string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  category: 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Smith Machine' | 'Cardio' | 'Soft Cardio' | 'Intense Cardio' | 'Plyometrics';
  grip: GripType;
  estimatedDurationPerSetSecs: number;
}

export function getExerciseName(ex: ExerciseDef, lang: 'en' | 'es'): string {
  if (typeof ex.name === 'string') return ex.name;
  return ex.name[lang] || ex.name['en'];
}

export const EXERCISE_DATABASE: ExerciseDef[] = [
  // Chest
  { id: '1', name: { en: 'Barbell Bench Press', es: 'Press de Banca con Barra' }, primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Front Delts'], category: 'Barbell', grip: 'Pronated', estimatedDurationPerSetSecs: 45 },
  { id: '2', name: { en: 'Incline Dumbbell Press', es: 'Press Inclinado con Mancuernas' }, primaryMuscle: 'Upper Chest', secondaryMuscles: ['Triceps', 'Front Delts'], category: 'Dumbbell', grip: 'Pronated', estimatedDurationPerSetSecs: 45 },
  { id: '3', name: { en: 'Cable Crossovers', es: 'Cruces en Polea' }, primaryMuscle: 'Chest', secondaryMuscles: [], category: 'Cable', grip: 'Neutral', estimatedDurationPerSetSecs: 40 },
  { id: '4', name: { en: 'Push-ups', es: 'Flexiones de Pecho' }, primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Front Delts', 'Abs'], category: 'Bodyweight', grip: 'Pronated', estimatedDurationPerSetSecs: 40 },
  { id: '5', name: { en: 'Machine Chest Press', es: 'Press de Pecho en Máquina' }, primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Front Delts'], category: 'Machine', grip: 'Pronated', estimatedDurationPerSetSecs: 40 },
  
  // Back
  { id: '6', name: { en: 'Deadlift', es: 'Peso Muerto' }, primaryMuscle: 'Lower Back', secondaryMuscles: ['Hamstrings', 'Glutes', 'Upper Back', 'Traps', 'Forearms'], category: 'Barbell', grip: 'Mixed', estimatedDurationPerSetSecs: 50 },
  { id: '7', name: { en: 'Lat Pulldown', es: 'Jalón al Pecho' }, primaryMuscle: 'Lats', secondaryMuscles: ['Biceps', 'Rear Delts'], category: 'Cable', grip: 'Wide', estimatedDurationPerSetSecs: 40 },
  { id: '8', name: { en: 'Barbell Row', es: 'Remo con Barra' }, primaryMuscle: 'Lats', secondaryMuscles: ['Upper Back', 'Biceps', 'Traps'], category: 'Barbell', grip: 'Pronated', estimatedDurationPerSetSecs: 45 },
  { id: '9', name: { en: 'Pull-ups', es: 'Dominadas' }, primaryMuscle: 'Lats', secondaryMuscles: ['Biceps', 'Upper Back'], category: 'Bodyweight', grip: 'Pronated', estimatedDurationPerSetSecs: 45 },
  { id: '10', name: { en: 'Seated Cable Row', es: 'Remo Sentado en Polea' }, primaryMuscle: 'Upper Back', secondaryMuscles: ['Lats', 'Biceps', 'Rear Delts'], category: 'Cable', grip: 'Neutral', estimatedDurationPerSetSecs: 40 },

  // Shoulders
  { id: '11', name: { en: 'Overhead Press', es: 'Press Militar' }, primaryMuscle: 'Front Delts', secondaryMuscles: ['Triceps', 'Lateral Delts'], category: 'Barbell', grip: 'Pronated', estimatedDurationPerSetSecs: 45 },
  { id: '12', name: { en: 'Lateral Raises', es: 'Elevaciones Laterales' }, primaryMuscle: 'Lateral Delts', secondaryMuscles: [], category: 'Dumbbell', grip: 'Pronated', estimatedDurationPerSetSecs: 35 },
  { id: '13', name: { en: 'Face Pulls', es: 'Jalones a la Cara (Face Pulls)' }, primaryMuscle: 'Rear Delts', secondaryMuscles: ['Upper Back'], category: 'Cable', grip: 'Pronated', estimatedDurationPerSetSecs: 35 },
  { id: '14', name: { en: 'Arnold Press', es: 'Press Arnold' }, primaryMuscle: 'Front Delts', secondaryMuscles: ['Lateral Delts', 'Triceps'], category: 'Dumbbell', grip: 'Supinated', estimatedDurationPerSetSecs: 45 },

  // Traps
  { id: '35', name: { en: 'Barbell Shrugs', es: 'Encogimientos con Barra' }, primaryMuscle: 'Traps', secondaryMuscles: ['Upper Back'], category: 'Barbell', grip: 'Pronated', estimatedDurationPerSetSecs: 35 },
  { id: '36', name: { en: 'Dumbbell Shrugs', es: 'Encogimientos con Mancuernas' }, primaryMuscle: 'Traps', secondaryMuscles: [], category: 'Dumbbell', grip: 'Neutral', estimatedDurationPerSetSecs: 35 },
  { id: '37', name: { en: 'Farmer Walks', es: 'Caminata del Granjero' }, primaryMuscle: 'Traps', secondaryMuscles: ['Forearms', 'Abs'], category: 'Dumbbell', grip: 'Neutral', estimatedDurationPerSetSecs: 45 },

  // Biceps & Forearms
  { id: '15', name: { en: 'Barbell Curl', es: 'Curl con Barra' }, primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'Barbell', grip: 'Supinated', estimatedDurationPerSetSecs: 35 },
  { id: '16', name: { en: 'Dumbbell Hammer Curl', es: 'Curl Martillo con Mancuernas' }, primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], category: 'Dumbbell', grip: 'Neutral', estimatedDurationPerSetSecs: 35 },
  { id: '17', name: { en: 'Cable Bicep Curl', es: 'Curl de Bíceps en Polea' }, primaryMuscle: 'Biceps', secondaryMuscles: [], category: 'Cable', grip: 'Supinated', estimatedDurationPerSetSecs: 35 },

  // Triceps
  { id: '18', name: { en: 'Tricep Pushdown', es: 'Extensión de Tríceps en Polea' }, primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'Cable', grip: 'Pronated', estimatedDurationPerSetSecs: 35 },
  { id: '19', name: { en: 'Overhead Tricep Extension', es: 'Extensión de Tríceps tras Nuca' }, primaryMuscle: 'Triceps', secondaryMuscles: [], category: 'Dumbbell', grip: 'Neutral', estimatedDurationPerSetSecs: 35 },
  { id: '20', name: { en: 'Close-Grip Bench Press', es: 'Press de Banca con Agarre Cerrado' }, primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Front Delts'], category: 'Barbell', grip: 'Close', estimatedDurationPerSetSecs: 45 },

  // Legs (Quads, Hamstrings)
  { id: '21', name: { en: 'Barbell Squat', es: 'Sentadilla con Barra' }, primaryMuscle: 'Quads', secondaryMuscles: ['Glutes', 'Lower Back', 'Abs'], category: 'Barbell', grip: 'Pronated', estimatedDurationPerSetSecs: 50 },
  { id: '22', name: { en: 'Leg Press', es: 'Prensa de Piernas' }, primaryMuscle: 'Quads', secondaryMuscles: ['Glutes', 'Calves'], category: 'Machine', grip: 'Any', estimatedDurationPerSetSecs: 45 },
  { id: '23', name: { en: 'Bulgarian Split Squat', es: 'Sentadilla Búlgara' }, primaryMuscle: 'Quads', secondaryMuscles: ['Glutes', 'Hamstrings'], category: 'Dumbbell', grip: 'Neutral', estimatedDurationPerSetSecs: 60 },
  { id: '24', name: { en: 'Leg Extensions', es: 'Extensiones de Cuádriceps' }, primaryMuscle: 'Quads', secondaryMuscles: [], category: 'Machine', grip: 'Any', estimatedDurationPerSetSecs: 40 },
  { id: '25', name: { en: 'Hamstring Curls', es: 'Curl de Isquiosurales' }, primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes'], category: 'Machine', grip: 'Any', estimatedDurationPerSetSecs: 40 },
  { id: '25_1', name: { en: 'Romanian Deadlift', es: 'Peso Muerto Rumano' }, primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes', 'Lower Back'], category: 'Barbell', grip: 'Pronated', estimatedDurationPerSetSecs: 50 },

   // Glutes
  { id: '26', name: { en: 'Barbell Hip Thrust', es: 'Empuje de Cadera con Barra (Hip Thrust)' }, primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], category: 'Barbell', grip: 'Pronated', estimatedDurationPerSetSecs: 45 },
  
  // Adductors
  { id: '26_1', name: { en: 'Adductor Machine', es: 'Máquina de Aductores' }, primaryMuscle: 'Adductors', secondaryMuscles: [], category: 'Machine', grip: 'Any', estimatedDurationPerSetSecs: 35 },
  { id: '26_2', name: { en: 'Sumo Squat', es: 'Sentadilla Sumo' }, primaryMuscle: 'Adductors', secondaryMuscles: ['Glutes', 'Quads'], category: 'Barbell', grip: 'Pronated', estimatedDurationPerSetSecs: 45 },
  
  // Calves
  { id: '27', name: { en: 'Standing Calf Raise', es: 'Elevación de Gemelos de Pie' }, primaryMuscle: 'Calves', secondaryMuscles: [], category: 'Machine', grip: 'Any', estimatedDurationPerSetSecs: 35 },
  { id: '28', name: { en: 'Seated Calf Raise', es: 'Elevación de Gemelos Sentado' }, primaryMuscle: 'Calves', secondaryMuscles: [], category: 'Machine', grip: 'Any', estimatedDurationPerSetSecs: 35 },

  // Core
  { id: '29', name: { en: 'Plank', es: 'Plancha' }, primaryMuscle: 'Abs', secondaryMuscles: ['Front Delts', 'Lower Back'], category: 'Bodyweight', grip: 'Any', estimatedDurationPerSetSecs: 60 },
  { id: '30', name: { en: 'Cable Crunches', es: 'Encogimientos en Polea' }, primaryMuscle: 'Abs', secondaryMuscles: [], category: 'Cable', grip: 'Neutral', estimatedDurationPerSetSecs: 40 },
  { id: '31', name: { en: 'Hanging Leg Raises', es: 'Elevaciones de Piernas Colgado' }, primaryMuscle: 'Abs', secondaryMuscles: [], category: 'Bodyweight', grip: 'Pronated', estimatedDurationPerSetSecs: 45 },
  { id: '34', name: { en: 'Serratus Punches', es: 'Golpes de Serrato' }, primaryMuscle: 'Serratus', secondaryMuscles: ['Abs', 'Obliques'], category: 'Bodyweight', grip: 'Neutral', estimatedDurationPerSetSecs: 40 },
  { id: '32', name: { en: 'Russian Twists', es: 'Giros Rusos' }, primaryMuscle: 'Obliques', secondaryMuscles: ['Abs'], category: 'Bodyweight', grip: 'Any', estimatedDurationPerSetSecs: 40 },
  { id: '33', name: { en: 'Side Planks', es: 'Planchas Laterales' }, primaryMuscle: 'Obliques', secondaryMuscles: ['Abs'], category: 'Bodyweight', grip: 'Any', estimatedDurationPerSetSecs: 45 },

  // Plyometrics
  { id: '38', name: { en: 'Box Jumps', es: 'Saltos al Cajón' }, primaryMuscle: 'Quads', secondaryMuscles: ['Glutes', 'Calves'], category: 'Plyometrics', grip: 'Any', estimatedDurationPerSetSecs: 30 },
  { id: '39', name: { en: 'Medicine Ball Slams', es: 'Lanzamiento de Balón Medicinal' }, primaryMuscle: 'Abs', secondaryMuscles: ['Front Delts', 'Lats'], category: 'Plyometrics', grip: 'Any', estimatedDurationPerSetSecs: 30 },
  { id: '40', name: { en: 'Jump Squats', es: 'Sentadillas con Salto' }, primaryMuscle: 'Quads', secondaryMuscles: ['Glutes', 'Hamstrings', 'Calves'], category: 'Plyometrics', grip: 'Any', estimatedDurationPerSetSecs: 35 }
];
