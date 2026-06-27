import { LoggedExercise, WorkoutSession } from "@/store/useStore";
import { ExerciseDef, EXERCISE_DATABASE } from "@/lib/exercises";

export function getSessionVolume(session: WorkoutSession, allExercises: ExerciseDef[]) {
  return session.exercises.reduce((acc, ex) => {
    const def = allExercises.find(e => e.id === ex.exerciseId);
    if (def?.category.includes('Cardio')) return acc;
    return acc + ex.loggedSets.filter(s => s.completed).reduce((s, ls) => s + ls.reps * ls.weightKg, 0);
  }, 0);
}

export function getExVolume(ex: LoggedExercise) {
  return ex.loggedSets.filter(s => s.completed).reduce((s, ls) => s + ls.reps * ls.weightKg, 0);
}

export function getTrend(curr: number, prev: number): 'up' | 'down' | 'neutral' {
  if (!prev || prev === 0) return 'neutral';
  const diff = (curr - prev) / prev;
  if (diff >= 0.05) return 'up';
  if (diff <= -0.05) return 'down';
  return 'neutral';
}

export function getVolumeAlerts(currentSession: WorkoutSession, history: WorkoutSession[], allExercises: ExerciseDef[], lang: 'en' | 'es') {
  const sameDayHistory = history
    .filter(s => s.dayId === currentSession.dayId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const currIdx = sameDayHistory.findIndex(s => s.id === currentSession.id);
  const pastSessions = currIdx === -1 ? sameDayHistory : sameDayHistory.slice(currIdx + 1);

  const alerts: string[] = [];
  const currVol = getSessionVolume(currentSession, allExercises);

  if (currVol === 0 || pastSessions.length === 0) return alerts;

  if (pastSessions.length >= 3) {
    const v1 = getSessionVolume(pastSessions[0], allExercises);
    const v2 = getSessionVolume(pastSessions[1], allExercises);
    const v3 = getSessionVolume(pastSessions[2], allExercises);

    const t1 = getTrend(currVol, v1);
    const t2 = getTrend(v1, v2);
    const t3 = getTrend(v2, v3);

    if (t1 === 'down' && t2 === 'down' && t3 === 'down') {
      alerts.push(lang === 'es'
        ? "Se detectó una caída significativa en el volumen por 3 entrenamientos consecutivos. Considera una semana de descarga (deload) o revisa tu descanso y nutrición."
        : "Significant volume drop detected for 3 consecutive sessions. Consider a deload week or review your rest and nutrition.");
    }
  }

  const twoWeeksMs = 14 * 86400000;
  const currDate = new Date(currentSession.date).getTime();
  const lastTwoWeeks = sameDayHistory.filter(s => {
    const d = new Date(s.date).getTime();
    return d <= currDate && (currDate - d) <= twoWeeksMs;
  });

  if (lastTwoWeeks.length >= 3) {
    let alwaysNeutral = true;
    for (let i = 0; i < lastTwoWeeks.length - 1; i++) {
      const vC = getSessionVolume(lastTwoWeeks[i], allExercises);
      const vP = getSessionVolume(lastTwoWeeks[i + 1], allExercises);
      if (getTrend(vC, vP) !== 'neutral') {
        alwaysNeutral = false;
        break;
      }
    }
    if (alwaysNeutral) {
      alerts.push(lang === 'es'
        ? "Estás en una meseta (volumen estable por 2 semanas). Sugerencias: varía el rango de repeticiones, cambia el orden de ejercicios o reduce ligeramente los descansos."
        : "You're in a plateau (stable volume for 2 weeks). Suggestions: vary rep ranges, change exercise order, or slightly reduce rest times.");
    }
  }

  return alerts;
}

export function calcEfficiencyScore(
  exercises: LoggedExercise[],
  history: WorkoutSession[],
  dayId: string
): number {
  let score = 0;
  let totalSets = 0;
  let completedSets = 0;

  exercises.forEach(ex => {
    totalSets += ex.plannedSets;
    completedSets += ex.loggedSets.filter(s => s.completed).length;
  });

  if (totalSets === 0) return 0;

  const completionRate = completedSets / totalSets;
  score = completionRate * 40;

  const lastSession = [...history].reverse().find(s => s.dayId === dayId);
  if (lastSession) {
    let progressCount = 0;
    let matchCount = 0;
    exercises.forEach(ex => {
      const prevEx = lastSession.exercises.find(e => e.exerciseId === ex.exerciseId);
      if (prevEx) {
        matchCount++;
        const def = EXERCISE_DATABASE.find(e => e.id === ex.exerciseId);
        const isCardio = def?.category.includes('Cardio');
        const prevVolume = prevEx.loggedSets.filter(s => s.completed).reduce((s, ls) => s + (isCardio ? ls.reps : ls.reps * ls.weightKg), 0);
        const currVolume = ex.loggedSets.filter(s => s.completed).reduce((s, ls) => s + (isCardio ? ls.reps : ls.reps * ls.weightKg), 0);
        if (currVolume > prevVolume) progressCount++;
      }
    });
    const progressRate = matchCount > 0 ? progressCount / matchCount : 0;
    score += progressRate * 40;
  } else {
    score += completionRate * 40;
  }

  const weightedSets = exercises.flatMap(e => e.loggedSets.filter(s => s.completed && s.weightKg > 0)).length;
  const weightRate = completedSets > 0 ? weightedSets / completedSets : 0;
  score += weightRate * 20;

  return Math.min(100, Math.round(score));
}

export type PRType = 'weight' | 'reps' | 'volume' | 'km' | 'speed';

export function checkPRs(session: WorkoutSession, history: WorkoutSession[], allExercises: ExerciseDef[]) {
  const prs: Record<string, PRType[]> = {};

  session.exercises.forEach(ex => {
    const def = allExercises.find(e => e.id === ex.exerciseId);
    const isBodyweight = def?.category === 'Bodyweight';
    const isCardio = def?.category.includes('Cardio');
    const currentSets = ex.loggedSets.filter(s => s.completed);
    if (currentSets.length === 0) return;

    const types = new Set<PRType>();

    const currentMaxWeight = Math.max(...currentSets.map(s => s.weightKg), 0);
    const currentTotalVolume = currentSets.reduce((acc, s) => acc + (s.reps * s.weightKg), 0);

    if (isCardio) {
      let maxKm = 0;
      let maxSpeed = 0;
      let maxTotalKm = 0;

      history.forEach(ps => {
        if (ps.id === session.id) return;
        const prevEx = ps.exercises.find(e => e.exerciseId === ex.exerciseId);
        if (prevEx) {
          const done = prevEx.loggedSets.filter(s => s.completed);
          done.forEach(s => {
            if (s.reps > maxKm) maxKm = s.reps;
            const speed = s.weightKg > 0 ? (s.reps / (s.weightKg / 3600)) : 0;
            if (speed > maxSpeed) maxSpeed = speed;
          });
          const total = done.reduce((a, b) => a + b.reps, 0);
          if (total > maxTotalKm) maxTotalKm = total;
        }
      });

      const currMaxKm = Math.max(...currentSets.map(s => s.reps));
      const currMaxSpeed = Math.max(...currentSets.map(s => s.weightKg > 0 ? (s.reps / (s.weightKg / 3600)) : 0));
      const currTotalKm = currentSets.reduce((a, b) => a + b.reps, 0);

      if (currMaxKm > maxKm && currMaxKm > 0) types.add('km');
      if (currMaxSpeed > maxSpeed && currMaxSpeed > 0) types.add('speed');
      if (currTotalKm > maxTotalKm && currTotalKm > 0) types.add('volume');

      if (types.size > 0) prs[ex.exerciseId] = Array.from(types);
      return;
    }

    let historicalMax = 0;
    let histMaxVolume = 0;
    let histMaxRepsGlobal = 0;

    history.forEach(prevSession => {
      if (prevSession.id === session.id) return;
      prevSession.exercises.forEach(prevEx => {
        if (prevEx.exerciseId === ex.exerciseId) {
          const prevSets = prevEx.loggedSets.filter(s => s.completed);
          if (prevSets.length === 0) return;

          const pMaxW = Math.max(...prevSets.map(s => s.weightKg), 0);
          const pVol = prevSets.reduce((acc, s) => acc + (s.reps * s.weightKg), 0);
          const pMaxR = Math.max(...prevSets.map(s => s.reps), 0);

          if (pMaxW > historicalMax) historicalMax = pMaxW;
          if (pVol > histMaxVolume) histMaxVolume = pVol;
          if (pMaxR > histMaxRepsGlobal) histMaxRepsGlobal = pMaxR;
        }
      });
    });

    if (currentMaxWeight > historicalMax && currentMaxWeight > 0) {
      types.add('weight');
    }

    if (currentTotalVolume > histMaxVolume && currentTotalVolume > 0) {
      types.add('volume');
    }

    if (isBodyweight) {
      const currentMaxReps = Math.max(...currentSets.map(s => s.reps), 0);
      if (currentMaxReps > histMaxRepsGlobal && currentMaxReps > 0) {
        types.add('reps');
      }
    } else {
      for (const s of currentSets) {
        if (s.weightKg <= 0) continue;
        let bestRepsAtThisWeight = 0;
        history.forEach(psess => {
          if (psess.id === session.id) return;
          psess.exercises.find(pe => pe.exerciseId === ex.exerciseId)?.loggedSets.forEach(ls => {
            if (ls.completed && ls.weightKg === s.weightKg && ls.reps > bestRepsAtThisWeight) bestRepsAtThisWeight = ls.reps;
          });
        });
        if (bestRepsAtThisWeight > 0 && s.reps > bestRepsAtThisWeight) {
          types.add('reps');
          break;
        }
      }
    }

    if (types.size > 0) {
      prs[ex.exerciseId] = Array.from(types);
    }
  });
  return prs;
}
