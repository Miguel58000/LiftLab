export type NutritionPhase = 'cutting' | 'maintenance' | 'bulking';
export type TrainingObjective = 'hypertrophy' | 'strength' | 'endurance';
export type FitnessGoal = NutritionPhase | TrainingObjective;

export interface MacroResult {
  goal: NutritionPhase;
  goalLabel: Record<'en' | 'es', string>;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalEn: string;
  goalEs: string;
}

/**
 * Improved calculation based on training hours, objective and healthy fat ratios.
 */
export function calculateMacros(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female' | 'other',
  trainingHours: number,
  goal: FitnessGoal,
  objective: TrainingObjective = 'hypertrophy',
  userProteinPref?: number
): MacroResult {
  // Normalizar el objetivo a una fase nutricional válida para el cálculo calórico
  const nutritionPhase: NutritionPhase = (goal === 'cutting' || goal === 'bulking' || goal === 'maintenance') ? goal : 'maintenance';

  // BMR
  const bmr = gender === 'male'
    ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5)
    : gender === 'female'
      ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161)
      : Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 78); // "other" approx

  // TDEE factor based on weekly training sets
  let activityFactor: number;
  if (trainingHours < 3) activityFactor = 1.2;
  else if (trainingHours < 6) activityFactor = 1.375;
  else if (trainingHours < 9) activityFactor = 1.55;
  else activityFactor = 1.725;

  const tdee = Math.round(bmr * activityFactor);

  // Adjust for goal
  let calories: number;
  switch (nutritionPhase) {
    case 'cutting':
      calories = Math.round(tdee * 0.85); // 15% deficit (more sustainable for high volume)
      break;
    case 'bulking':
      calories = Math.round(tdee * 1.15); // 15% surplus
      break;
    default: // maintenance
      calories = tdee;
  }

  // Protein: User pref or default based on science (1.6-2.2 range)
  let proteinGPerKg = userProteinPref || (nutritionPhase === 'cutting' ? 1.8 : objective === 'strength' ? 1.8 : 1.6);
  const protein = Math.round(proteinGPerKg * weightKg);

  // Healthy Fat: Vital for hormones (0.8g - 1g / kg)
  const fatGPerKg = 0.9; // Vital for hormonal health as requested
  const fat = Math.round(fatGPerKg * weightKg);

  // Carbs fill the rest
  const proteinCal = protein * 4;
  const fatCal = fat * 9;
  const remainingCal = Math.max(0, calories - proteinCal - fatCal);
  const carbs = Math.round(remainingCal / 4);

  return {
    goal: nutritionPhase,
    goalLabel: {
      en: nutritionPhase === 'cutting' ? 'Cutting Phase' : nutritionPhase === 'bulking' ? 'Bulking Phase' : 'Maintenance',
      es: nutritionPhase === 'cutting' ? 'Fase de Definición' : nutritionPhase === 'bulking' ? 'Fase de Volumen' : 'Mantenimiento',
    },
    goalEn: nutritionPhase === 'cutting' ? 'Cutting Phase' : nutritionPhase === 'bulking' ? 'Bulking Phase' : 'Maintenance',
    goalEs: nutritionPhase === 'cutting' ? 'Fase de Definición' : nutritionPhase === 'bulking' ? 'Fase de Volumen' : 'Mantenimiento',
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
export function inferBestGoal(weeklySets: number, weightKg: number): NutritionPhase {
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
