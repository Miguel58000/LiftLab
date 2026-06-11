export type FitnessGoal = 'cutting' | 'maintenance' | 'bulking';

export interface MacroResult {
  goal: FitnessGoal;
  goalLabel: Record<'en' | 'es', string>;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalEn: string;
  goalEs: string;
}

/**
 * Calcula calorías y macros basados en:
 * - Fórmula de Mifflin-St Jeor para TMB
 * - Nivel de actividad aproximado según volumen total semanal de entrenamiento
 * - Objetivo: déficit (cutting), mantenimiento, superávit (bulking)
 */
export function calculateMacros(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female' | 'other',
  weeklySets: number,
  goal: FitnessGoal
): MacroResult {
  // BMR Mifflin-St Jeor
  const bmr = gender === 'male'
    ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5)
    : gender === 'female'
      ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161)
      : Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 78); // "other" approx

  // TDEE factor based on weekly training sets
  // Beginner: 1-20 sets; Intermediate: 21-40; Advanced: 41-60; Very advanced: >60
  let activityFactor: number;
  if (weeklySets <= 20) {
    activityFactor = 1.25; // sedentary + some light activity
  } else if (weeklySets <= 40) {
    activityFactor = 1.4; // moderately active
  } else if (weeklySets <= 65) {
    activityFactor = 1.55; // active
  } else {
    activityFactor = 1.725; // very active
  }

  const tdee = Math.round(bmr * activityFactor);

  // Adjust for goal
  let calories: number;
  switch (goal) {
    case 'cutting':
      calories = Math.round(tdee * 0.8); // 20% deficit
      break;
    case 'bulking':
      calories = Math.round(tdee * 1.1); // 10% surplus
      break;
    default: // maintenance
      calories = tdee;
  }

  // Macro split
  // Protein: 2g/kg for cutting, 1.8g/kg bulking, 1.6g/kg maintenance
  let proteinGPerKg: number;
  switch (goal) {
    case 'cutting': proteinGPerKg = 2.2; break;
    case 'bulking': proteinGPerKg = 1.8; break;
    default: proteinGPerKg = 1.6;
  }

  const protein = Math.round(proteinGPerKg * weightKg);
  const proteinCal = protein * 4;

  // Remaining calories split 30% fat / 70% carbs
  const remainingCal = calories - proteinCal;
  const fat = Math.round(remainingCal * 0.3 / 9);
  const carbs = Math.round(remainingCal * 0.7 / 4);

  return {
    goal,
    goalLabel: {
      en: goal === 'cutting' ? 'Cutting Phase' : goal === 'bulking' ? 'Bulking Phase' : 'Maintenance',
      es: goal === 'cutting' ? 'Fase de Definición' : goal === 'bulking' ? 'Fase de Volumen' : 'Mantenimiento',
    },
    goalEn: goal === 'cutting' ? 'Cutting Phase' : goal === 'bulking' ? 'Bulking Phase' : 'Maintenance',
    goalEs: goal === 'cutting' ? 'Fase de Definición' : goal === 'bulking' ? 'Fase de Volumen' : 'Mantenimiento',
    calories,
    protein,
    carbs,
    fat,
  };
}

export function goalLabel(goal: FitnessGoal, lang: 'en' | 'es'): string {
  return goal === 'cutting'
    ? (lang === 'es' ? 'Fase de Definición' : 'Cutting Phase')
    : goal === 'bulking'
      ? (lang === 'es' ? 'Fase de Volumen' : 'Bulking Phase')
      : (lang === 'es' ? 'Mantenimiento' : 'Maintenance');
}

/**
 * Infiere el objetivo que corresponde a la rutina según el volumen semanal.
 * Lógica simplificada: volumen alto ⇒ necesitas superávit (bulking),
 * volumen medio/bajo ⇒ mantenimiento o definición.
 */
export function inferBestGoal(weeklySets: number, weightKg: number): FitnessGoal {
  // Si hay mucho volumen, probablemente estés en bulking
  if (weeklySets > 45) return 'bulking';
  if (weeklySets > 20) return 'maintenance';
  // Pocos sets: podría ser cutting o mantenimiento
  // Si peso < 75kg probablemente necesites más calorías; si > 85kg, déficit moderado puede ser ok
  if (weightKg > 85 && weeklySets <= 20) return 'cutting';
  return 'maintenance';
}

/**
 * Sugiere ajustes sencillos a la rutina si el objetivo del usuario no coincide
 * con el objetivo óptimo calculado.
 */
export function suggestRoutineAdjustments(
  currentGoal: FitnessGoal,
  bestGoal: FitnessGoal,
  totalSetsWeekly: number,
  lang: 'en' | 'es'
): string[] {
  if (currentGoal === bestGoal) return [];

  const suggestions: string[] = [];

  if (lang === 'es') {
    if (bestGoal === 'bulking') {
      suggestions.push('Para tu nivel de actividad y volumen semanal, alcanzar un superávit calórico te ayudará a ganar fuerza y masa muscular más rápido.');
      suggestions.push(`Tu rutina acumula ${totalSetsWeekly} series semanales, un volumen considerable que requiere energía extra para una recuperación óptima.`);
      suggestions.push('Considerá agregar 1–2 días más o aumentá las series por ejercicio (+1 serie por grupo muscular).');
    } else if (bestGoal === 'cutting') {
      suggestions.push('Para tu perfil, un pequeño déficit calórico te permitirá perder grasa sin perder demasiada fuerza.');
      suggestions.push(`Tu rutina tiene ${totalSetsWeekly} series semanales. Mantené la intensidad alta mientras reducís las calorías.`);
      suggestions.push('Si bajás de peso, considerá aumentar moderadamente la proteína (2.2–2.4 g/kg).');
    } else { // maintenance
      suggestions.push('Tu volumen de entrenamiento está en un rango muy bueno para mantenimiento.');
      suggestions.push('Podés mantener las calorías actuales y disfrutar de un progreso estable sin ganar grasa de más.');
      if (totalSetsWeekly < 20) {
        suggestions.push('Considerá agregar unas pocas series adicionales para maximizar el estímulo de entrenamiento.');
      }
    }
  } else {
    if (bestGoal === 'bulking') {
      suggestions.push('Given your training volume, a caloric surplus will help you gain strength and muscle faster.');
      suggestions.push(`Your routine accumulates ${totalSetsWeekly} weekly sets – a significant volume that needs extra energy for optimal recovery.`);
      suggestions.push('Consider adding 1–2 extra days or increasing sets per exercise by +1 set per muscle group.');
    } else if (bestGoal === 'cutting') {
      suggestions.push('For your profile, a moderate caloric deficit will allow fat loss without losing much strength.');
      suggestions.push(`Your routine has ${totalSetsWeekly} weekly sets. Keep intensity high while reducing calories.`);
      suggestions.push('If you are losing weight, consider bumping up protein to 2.2–2.4 g/kg.');
    } else {
      suggestions.push('Your training volume is in a great range for maintenance.');
      suggestions.push('You can keep your current calories and enjoy steady progress without gaining excess fat.');
      if (totalSetsWeekly < 20) {
        suggestions.push('Consider adding a few extra sets to maximize your training stimulus.');
      }
    }
  }

  return suggestions;
}
