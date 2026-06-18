import { MuscleGroup, EXERCISE_DATABASE, ExerciseDef } from "./exercises";
import { WorkoutDay } from "@/store/useStore";
import { getMuscleLabel } from "@/lib/i18n";

export interface AnalysisResults {
  totalSetsPerMuscle: Record<MuscleGroup, number>;
  totalSetsWeekly: number;
  muscleFrequency: Record<MuscleGroup, number>;
  estimatedDurationMins: number;
  warnings: string[];
  suggestions: string[];
  balanceScore: number;
  efficiencyScore: number;
}



export function analyzeRoutine(
  days: WorkoutDay[], 
  customExercises: ExerciseDef[], 
  t: Record<string, any>, 
  lang: "en" | "es" = "en"
): AnalysisResults {
  const setsPerMuscle: Partial<Record<MuscleGroup, number>> = {};
  const primaryOnlySets: Partial<Record<MuscleGroup, number>> = {};
  const freqPerMuscle: Partial<Record<MuscleGroup, number>> = {};
  let totalSetsWeekly = 0;
  let estimatedDurationSecs = 0;

  const allMuscles: MuscleGroup[] = [
    'Chest', 'Upper Chest', 'Lats', 'Upper Back', 'Lower Back', 'Traps',
    'Front Delts', 'Lateral Delts', 'Rear Delts', 'Serratus',
    'Biceps', 'Triceps', 'Forearms',
    'Quads', 'Hamstrings', 'Glutes', 'Adductors', 'Calves', 
    'Abs', 'Obliques'
  ];
  allMuscles.forEach(m => {
    setsPerMuscle[m] = 0;
    primaryOnlySets[m] = 0;
    freqPerMuscle[m] = 0;
  });

  const allExercises = [...EXERCISE_DATABASE, ...customExercises];

  days.forEach(day => {
    const musclesHitToday = new Set<MuscleGroup>();

    day.exercises.forEach(ex => {
      const exerciseDef = allExercises.find(e => e.id === ex.exerciseId);
      if (!exerciseDef) return;

      const sets = ex.sets;
      totalSetsWeekly += sets;

      const primaryMuscle = ex.primaryMuscleOverride || exerciseDef.primaryMuscle;
      const secondaryMuscles = ex.secondaryMusclesOverride || exerciseDef.secondaryMuscles || [];

      // Primary muscle gets 1.0x sets
      if (primaryMuscle) {
        setsPerMuscle[primaryMuscle]! += sets;
        primaryOnlySets[primaryMuscle]! += sets;
        musclesHitToday.add(primaryMuscle);
      }

      // Secondary muscle gets 0.5x sets (for per-muscle volume only, NOT for balance)
      secondaryMuscles.forEach(m => {
        setsPerMuscle[m]! += sets * 0.5;
        musclesHitToday.add(m);
      });

      // Calculate time
      const restTime = ex.sets * ex.restSecs;
      const workTime = ex.sets * exerciseDef.estimatedDurationPerSetSecs;
      estimatedDurationSecs += restTime + workTime;
    });

    musclesHitToday.forEach(m => {
      freqPerMuscle[m]! += 1;
    });
  });

  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Logic for warnings & suggestions
  let daysOver25Sets = 0;
  days.forEach(day => {
    const daySets = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    if (daySets > 25) daysOver25Sets++;
  });

  if (daysOver25Sets > 0) {
    warnings.push(
      lang === "es"
        ? `${daysOver25Sets} día(s) tienen más de 25 series. Este volumen extremadamente alto puede afectar negativamente tu recuperación y tu puntaje de eficiencia.`
        : `${daysOver25Sets} day(s) have over 25 sets. This extremely high volume may negatively impact your recovery and efficiency score.`
    );
  }

  // Push/Pull/Legs balance — ONLY primary sets (no secondary inflation)
  const pushVolume = (primaryOnlySets['Chest'] || 0) + (primaryOnlySets['Upper Chest'] || 0) + (primaryOnlySets['Front Delts'] || 0) + (primaryOnlySets['Lateral Delts'] || 0) + (primaryOnlySets['Triceps'] || 0);
  const pullVolume = (primaryOnlySets['Lats'] || 0) + (primaryOnlySets['Upper Back'] || 0) + (primaryOnlySets['Lower Back'] || 0) + (primaryOnlySets['Rear Delts'] || 0) + (primaryOnlySets['Traps'] || 0) + (primaryOnlySets['Biceps'] || 0) + (primaryOnlySets['Forearms'] || 0);
  const legsVolume = (primaryOnlySets['Quads'] || 0) + (primaryOnlySets['Hamstrings'] || 0) + (primaryOnlySets['Glutes'] || 0) + (primaryOnlySets['Calves'] || 0) + (primaryOnlySets['Adductors'] || 0);
  
  if (pushVolume > pullVolume * 1.5 && pullVolume > 0) {
    warnings.push(
      lang === "es"
        ? `El volumen de empuje (${pushVolume} series) es significativamente mayor que el de tirón (${pullVolume} series). Esto puede generar problemas de postura y lesiones.`
        : `Push volume (${pushVolume} sets) is significantly higher than pull volume (${pullVolume} sets). This can lead to posture issues and injuries.`
    );
  } else if (pullVolume > pushVolume * 1.5 && pushVolume > 0) {
    warnings.push(
      lang === "es"
        ? `El volumen de tirón (${pullVolume} series) es significativamente mayor que el de empuje (${pushVolume} series). Esto puede generar desbalances y lesiones.`
        : `Pull volume (${pullVolume} sets) is significantly higher than push volume (${pushVolume} sets).`
    );
  }

  allMuscles.forEach(m => {
    const sets = setsPerMuscle[m] || 0;
    const freq = freqPerMuscle[m] || 0;
    const localizedMuscle = getMuscleLabel(m, lang);

    if (sets > 22) {
      warnings.push(
        lang === "es"
          ? `El volumen de ${localizedMuscle} es muy alto (${sets} series). Considerá reducirlo a 12-20 series para una recuperación óptima.`
          : `${m} volume is very high (${sets} sets). Consider reducing to 12-20 sets for optimal recovery.`
      );
    } else if (sets < 8 && sets > 0) {
      suggestions.push(
        lang === "es"
          ? `El volumen de ${localizedMuscle} es bajo (${sets} series). Considerá aumentarlo a al menos 10 series si es una prioridad.`
          : `${m} volume is low (${sets} sets). Consider increasing to at least 10 sets if it's a priority.`
      );
    }

    if (freq === 1 && sets > 15) {
      suggestions.push(
        lang === "es"
          ? `Estás haciendo ${sets} series de ${localizedMuscle} en una sola sesión. Considerá dividirlo en 2 sesiones para mejorar la síntesis de proteínas musculares.`
          : `You are doing ${sets} sets for ${m} in a single session. Consider splitting it into 2 sessions for better muscle protein synthesis.`
      );
    }
  });

  if (days.length === 0) {
    suggestions.push(t.dash_ins_nodata || "Add some workout days to see your analysis.");
  } else if (totalSetsWeekly < 30) {
    suggestions.push(
      lang === "es"
        ? "Tu volumen semanal total es bastante bajo. Está bien para mantenimiento o principiantes, pero puede no ser óptimo para un desarrollo máximo."
        : "Your overall weekly volume is quite low. This is fine for maintenance or beginners, but might not be optimal for maximum growth."
    );
  }

  // Calculate scores — using primary-only for balance
  let balanceScore = 100;
  if (Math.abs(pushVolume - pullVolume) > 5) balanceScore -= 10;
  if (legsVolume < totalSetsWeekly * 0.2 && totalSetsWeekly > 0) balanceScore -= 20;
  if (warnings.length > 0) balanceScore -= warnings.length * 5;
  balanceScore = Math.max(0, Math.min(100, balanceScore));

  let efficiencyScore = 100;
  if (daysOver25Sets > 0) efficiencyScore -= daysOver25Sets * 15;
  const avgRest = days.reduce((sum, day) => sum + day.exercises.reduce((s, ex) => s + ex.restSecs, 0), 0) / (days.reduce((sum, d) => sum + d.exercises.length, 0) || 1);
  if (avgRest < 60) efficiencyScore -= 10; // Too little rest for hypertrophy
  efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

  return {
    totalSetsPerMuscle: setsPerMuscle as Record<MuscleGroup, number>,
    totalSetsWeekly,
    muscleFrequency: freqPerMuscle as Record<MuscleGroup, number>,
    estimatedDurationMins: Math.round(estimatedDurationSecs / 60),
    warnings,
    suggestions,
    balanceScore,
    efficiencyScore
  };
}

