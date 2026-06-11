"use client";

import { useState, useMemo, useEffect } from "react";
import { useStore, WorkoutSession } from "@/store/useStore"; 
import { analyzeRoutine } from "@/lib/analyzer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Info, Clock, Activity, Target, TrendingUp, TrendingDown, Minus, RefreshCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MuscleGroup, EXERCISE_DATABASE } from "@/lib/exercises";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { translations, getMuscleLabel } from "@/app/dashboard/i18n";
import { calculateMacros, inferBestGoal, goalLabel, FitnessGoal, MacroResult } from "@/lib/macros";
import { getPersonalizedSuggestions } from "@/lib/suggestions";
import { formatWeight, getWeightInUnit, convertWeightInputToKg } from "@/lib/units";

const CORE_DISPLAY_MUSCLES: MuscleGroup[] = [
  'Adductors', 'Chest', 'Lats', 'Traps', 'Quads', 'Tibialis', 'Brachialis', 'Hamstrings', 'Serratus', 'Neck', 'Psoas'
];

const HEATMAP_MUSCLES: MuscleGroup[] = [
  'Adductors', 'Chest', 'Upper Chest', 'Lats', 'Traps', 'Upper Back', 'Lower Back',
  'Front Delts', 'Lateral Delts', 'Rear Delts', 'Serratus',
  'Biceps', 'Triceps', 'Forearms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 
  'Tibialis',
  'Brachialis',
  'Abs', 'Obliques', 'Neck',
  'Psoas'
];

const PUSH_MUSCLES: MuscleGroup[] = ["Chest", "Upper Chest", "Front Delts", "Lateral Delts", "Triceps"];
const PULL_MUSCLES: MuscleGroup[] = ["Lats", "Upper Back", "Lower Back", "Traps", "Rear Delts", "Biceps", "Brachialis", "Forearms", "Neck"];
const LEGS_MUSCLES: MuscleGroup[] = ["Quads", "Hamstrings", "Glutes", "Calves", "Adductors", "Tibialis", "Psoas"];

export default function DashboardPage() {
  const days = useStore(s => s.days);
  const customExercises = useStore(s => s.customExercises);
  const language = useStore(s => s.language) as "en" | "es";
  const workoutHistory = useStore(s => s.workoutHistory);
  const profile = useStore(s => s.profile);
  const setProfile = useStore(s => s.setProfile);
  const weightUnit = useStore(s => s.weightUnit) || "kg";

  const t = translations[language];
  const showMetrics = true;
  const [isHydrated, setIsHydrated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newWeightInput, setNewWeightInput] = useState("");
  const [weightFeedback, setWeightFeedback] = useState<{message: string, type: 'good' | 'neutral' | 'bad'} | null>(null);
  const [weightChangeData, setWeightChangeData] = useState<{diff: number, daysElapsed: number} | null>(null);

  useEffect(() => {
    const checkHydration = () => {
      if (useStore.persist?.hasHydrated()) {
        setIsHydrated(true);
        setRefreshKey(prev => prev + 1);
      }
    };

    checkHydration();
    const unsub = useStore.persist?.onFinishHydration(checkHydration);

    return () => unsub?.();
  }, []);

  const analysis = useMemo(() => {
    const res = analyzeRoutine(days, customExercises, t, language);

    const uiSets: Record<string, number> = {};
    const fatigueSets: Record<string, number> = {};
    let totalWeightedWeekly = 0;
    let totalCardioMinutes = 0;
    const allEx = [...EXERCISE_DATABASE, ...customExercises];

    days.forEach(day => {
      day.exercises.forEach(ex => {
        const def = allEx.find(e => e.id === ex.exerciseId);
        if (!def) return;

        const primaryMuscle = ex.primaryMuscleOverride || def.primaryMuscle;
        const secondaryMuscles = ex.secondaryMusclesOverride || def.secondaryMuscles || [];

        if (def.category.includes('Cardio')) {
          const cat = def.category as string;
          const totalMinutes = ex.weightKg ? (ex.weightKg / 60) : (ex.sets * ex.reps);
          totalCardioMinutes += totalMinutes;

          const INTENSITY_MAP: Record<string, number> = {
            'Soft Cardio': 0.5,
            'Moderate Cardio': 1.0,
            'Intense Cardio': 1.5
          };
          const baseFatigue = INTENSITY_MAP[cat] || 0.5;
          const durationMultiplier = totalMinutes > 40 ? 1.5 : totalMinutes > 20 ? 1.25 : 1.0;
          const equivSets = baseFatigue * durationMultiplier;

          LEGS_MUSCLES.forEach(m => {
            fatigueSets[m] = (fatigueSets[m] || 0) + equivSets;
            totalWeightedWeekly += equivSets;
          });

          const upperBodyMuscles = HEATMAP_MUSCLES.filter(m => !LEGS_MUSCLES.includes(m));
          upperBodyMuscles.forEach(m => {
            const weight = equivSets * 0.5;
            fatigueSets[m] = (fatigueSets[m] || 0) + weight;
            totalWeightedWeekly += weight;
          });
          return;
        }

        if (primaryMuscle) {
          uiSets[primaryMuscle] = (uiSets[primaryMuscle] || 0) + ex.sets;
          fatigueSets[primaryMuscle] = (fatigueSets[primaryMuscle] || 0) + ex.sets;
          totalWeightedWeekly += ex.sets;
        }

        secondaryMuscles.forEach((m) => {
          const weight = ex.sets * 0.5;
          uiSets[m] = (uiSets[m] || 0) + weight;
          fatigueSets[m] = (fatigueSets[m] || 0) + weight;
          totalWeightedWeekly += weight;
        });
      });
    });

    const volumeKeywords = ["volumen", "volume", "overworked", "sobreentrenamiento", "demasiadas", "too many", "excesivo", "excessive", "overtraining", "excess"];
    const filterVolume = (s: string) => !volumeKeywords.some(kw => s.toLowerCase().includes(kw));
    
    const warnings = res.warnings.filter(filterVolume);
    const suggestions = res.suggestions.filter(filterVolume);

    const pushSets = PUSH_MUSCLES.reduce((acc, m) => acc + (fatigueSets[m] || 0), 0);
    const pullSets = PULL_MUSCLES.reduce((acc, m) => acc + (fatigueSets[m] || 0), 0);
    const legsSets = LEGS_MUSCLES.reduce((acc, m) => acc + (fatigueSets[m] || 0), 0);
    
    const totalMain = pushSets + pullSets + legsSets;
    if (totalMain > 5) {
      const avg = totalMain / 3;
      if (pushSets < avg * 0.6) suggestions.push(language === "es" ? "Considera añadir más ejercicios de Empuje (Pecho/Hombros/Tríceps) para balancear la rutina." : "Add more Push exercises (Chest/Shoulders/Triceps) for balance.");
      if (pullSets < avg * 0.6) suggestions.push(language === "es" ? "Considera añadir más ejercicios de Tracción (Espalda/Bíceps/Braquial) para balancear la rutina." : "Add more Pull exercises (Back/Biceps/Brachialis) for balance.");
      if (legsSets < avg * 0.6) suggestions.push(language === "es" ? "Considera añadir más ejercicios de Piernas para balancear la rutina." : "Add more Leg exercises for balance.");
    }

    return { 
      ...res, 
      warnings, 
      suggestions, 
      totalSetsPerMuscle: uiSets, 
      totalSetsWeekly: totalWeightedWeekly,
      totalCardioMinutes
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, customExercises, t, language, refreshKey]);

  const weeklySetsTotal = analysis.totalSetsWeekly;

  const isReviewDue = useMemo(() => 
    // eslint-disable-next-line react-hooks/purity
    profile?.lastReviewAt && (Date.now() - new Date(profile.lastReviewAt).getTime() > 60 * 86400000)
  , [profile]);

  const isWeightUpdateDue = useMemo(() => {
    if (!profile) return false;
    const goal = profile.targetMacros?.goal || 'maintenance';
    const daysInterval = (goal === 'bulking' || goal === 'cutting') ? 7 : 30;
    // eslint-disable-next-line react-hooks/purity
    return Date.now() - new Date(profile.lastWeightUpdateAt || profile.createdAt || 0).getTime() > daysInterval * 86400000;
  }, [profile]);

  const macrosAndState = useMemo(() => {
    if (!profile?.heightCm || !profile?.weightKg) {
      return { macros: null as MacroResult | null, bestGoal: null as FitnessGoal | null, goalState: 'none' as const, suggestions: [] as string[] };
    }
    const bestGoal = inferBestGoal(weeklySetsTotal, profile.weightKg);
    let currentDisplayedMacros: MacroResult;
    let goalState: 'pending' | 'confirmed' | 'mismatch';

    if (!profile.targetMacros || isReviewDue) {
      // If no target macros are set or review is due, prompt user to pick.
      // Display macros based on the inferred best goal.
      currentDisplayedMacros = calculateMacros(
        profile.weightKg,
        profile.heightCm,
        profile.age || 25,
        profile.gender || 'male',
        weeklySetsTotal,
        bestGoal
      );
      goalState = 'pending';
    } else {
      // Target macros are set and no review is due.
      // Display macros based on the user's chosen targetMacros.
      const stored = profile.targetMacros;
      currentDisplayedMacros = {
        ...stored,
        goalEn: (stored as any).goalEn || goalLabel(stored.goal, 'en'),
        goalEs: (stored as any).goalEs || goalLabel(stored.goal, 'es'),
      } as MacroResult;
      goalState = currentDisplayedMacros.goal === bestGoal ? 'confirmed' : 'mismatch';
    }
    const suggestions = (profile?.goals && profile.goals.length > 0)
      ? getPersonalizedSuggestions(analysis.totalSetsPerMuscle, profile.goals, language)
      : [];
    return { macros: currentDisplayedMacros, bestGoal, goalState, suggestions };
  }, [profile, analysis, language, isReviewDue, weeklySetsTotal]);

  const handleGoalPick = (chosenGoal: FitnessGoal) => {
    if (!profile || !macrosAndState.macros) return;
    const adjusted = calculateMacros(
      profile.weightKg!, 
      profile.heightCm!, 
      profile.age || 25, 
      profile.gender || 'male', 
      weeklySetsTotal, 
      chosenGoal
    );
    
    setProfile({ 
      ...profile, 
      targetMacros: adjusted,
      lastReviewAt: new Date().toISOString() // Actualizamos la fecha para cerrar el ciclo de revisión
    });

    // Calculamos el feedback ahora que conocemos la meta seleccionada
    if (weightChangeData) {
      const { diff, daysElapsed } = weightChangeData;
      const weeklyRate = (diff / daysElapsed) * 7;
      const currentWeight = profile.weightKg || 70;
      
      let msg = "";
      let type: 'good' | 'neutral' | 'bad' = 'neutral';
      const isSpanish = language === 'es';

      // --- PARÁMETROS DE SALUD (Basados en tu peso actual) ---
      const minLossWeekly = currentWeight * 0.005; // 0.5% del peso corporal
      const maxLossWeekly = currentWeight * 0.01;  // 1.0% del peso corporal
      const minGainWeekly = 1.0 / 4.345;           // 1kg al mes (~0.23kg/sem)
      const maxGainWeekly = 1.5 / 4.345;           // 1.5kg al mes (~0.34kg/sem)

      // Cálculo del Punto Medio de Mantenimiento (Equilibrado)
      const centerLoss = -(minLossWeekly + maxLossWeekly) / 2; // Centro de pérdida saludable
      const centerGain = (minGainWeekly + maxGainWeekly) / 2;  // Centro de ganancia saludable
      const maintMid = (centerLoss + centerGain) / 2;
      // Tolerancia: 5% del punto medio, pero con un suelo de 0.15kg para absorber fluctuaciones de agua/glucógeno
      const maintTol = Math.max(0.15, Math.abs(maintMid * 0.05));

      const rateStr = `${weeklyRate > 0 ? '+' : ''}${weeklyRate.toFixed(2)}kg/${isSpanish ? 'sem' : 'week'}`;

      // Clasificación de la tendencia real detectada
      let actualPace: FitnessGoal | 'aggressive-loss' | 'aggressive-gain' = 'maintenance';
      if (weeklyRate < -maxLossWeekly) actualPace = 'aggressive-loss';
      else if (weeklyRate >= -maxLossWeekly && weeklyRate <= -minLossWeekly) actualPace = 'cutting';
      else if (weeklyRate >= minGainWeekly && weeklyRate <= maxGainWeekly) actualPace = 'bulking';
      else if (weeklyRate > maxGainWeekly) actualPace = 'aggressive-gain';
      else actualPace = 'maintenance';

      if (chosenGoal === 'bulking') {
        if (actualPace === 'bulking') {
          msg = isSpanish ? `¡Buen Volumen! Ganancia controlada (${rateStr}) acorde a tu objetivo de músculo.` : `Good Bulk! Controlled gain (${rateStr}) matches your muscle goal.`;
          type = 'good';
        } else if (actualPace === 'aggressive-gain') {
          msg = isSpanish ? `¡Cuidado! Ganancia agresiva (${rateStr}). Superas el límite saludable de 1.5kg/mes y ganarás grasa excesiva.` : `Warning! Aggressive gain (${rateStr}). Exceeding healthy 1.5kg/month limit; you will gain excess fat.`;
          type = 'bad';
        } else {
          msg = isSpanish ? `Fase Errada: Tu ritmo (${rateStr}) corresponde a ${actualPace === 'cutting' ? 'Definición' : 'Mantenimiento'}. Incrementa calorías para entrar en Volumen.` : `Wrong Phase: Your pace (${rateStr}) matches ${actualPace === 'cutting' ? 'Cutting' : 'Maintenance'}. Increase calories for Bulking.`;
          type = 'bad';
        }
      } else if (chosenGoal === 'cutting') {
        if (actualPace === 'cutting') {
          msg = isSpanish ? `¡Buena Definición! Pierdes entre el 0.5% y 1% (${rateStr}) de tu peso corporal.` : `Good Cut! Losing between 0.5% and 1% (${rateStr}) of your body weight.`;
          type = 'good';
        } else if (actualPace === 'aggressive-loss') {
          msg = isSpanish ? `¡Cuidado! Pérdida agresiva (${rateStr}). Superas el 1% semanal; riesgo alto de perder masa muscular.` : `Warning! Aggressive loss (${rateStr}). Exceeding 1% weekly; high risk of muscle loss.`;
          type = 'bad';
        } else {
          msg = isSpanish ? `Fase Errada: Tu ritmo (${rateStr}) corresponde a ${actualPace === 'bulking' ? 'Volumen' : 'Mantenimiento'}. Revisa tu déficit para entrar en Definición.` : `Wrong Phase: Your pace (${rateStr}) matches ${actualPace === 'bulking' ? 'Bulking' : 'Maintenance'}. Check your deficit for Cutting.`;
          type = 'bad';
        }
      } else { // maintenance
        const diffFromMid = Math.abs(weeklyRate - maintMid);
        if (diffFromMid <= maintTol) { 
          msg = isSpanish ? `¡Perfecto! Tu peso (${rateStr}) está en el rango equilibrado de mantenimiento.` : `Perfect! Your weight (${rateStr}) is within the balanced maintenance range.`;
          type = 'good';
        } else if (weeklyRate > maintMid) {
          msg = isSpanish ? `Fase Errada: Tu peso sube (${rateStr}). Este ritmo tiende a Volumen; reduce calorías para mantenerte.` : `Wrong Phase: Weight is increasing (${rateStr}). This pace tends to Bulking; reduce calories to maintain.`;
          type = 'bad';
        } else {
          msg = isSpanish ? `Fase Errada: Tu peso baja (${rateStr}). Este ritmo tiende a Definición; sube calorías para mantenerte.` : `Wrong Phase: Weight is decreasing (${rateStr}). This pace tends to Cutting; increase calories to maintain.`;
          type = 'bad';
        }
      }

      setWeightFeedback({ message: msg, type });
      setWeightChangeData(null);
    }
  };

  const handleSaveWeight = (val: string) => {
    const inputVal = parseFloat(val.replace(',', '.'));
    if (isNaN(inputVal) || !profile) return;
    
    const kgVal = convertWeightInputToKg(inputVal, weightUnit);
    const oldWeight = profile.weightKg || kgVal;
    const diff = kgVal - oldWeight;

    const lastUpdate = profile.lastWeightUpdateAt 
      ? new Date(profile.lastWeightUpdateAt).getTime() 
      : new Date(profile.createdAt || 0).getTime();
    const daysElapsed = Math.max(1, (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24));
    
    const newHistory = [...(profile.weightHistory || [])];
    newHistory.push({ date: new Date().toISOString(), weightKg: kgVal });

    setProfile({ 
      ...profile, 
      weightKg: kgVal, 
      lastWeightUpdateAt: new Date().toISOString(), 
      weightHistory: newHistory,
      targetMacros: undefined // Forzar estado 'pending'
    });
    
    setWeightChangeData({ diff, daysElapsed });
    setNewWeightInput("");
    setWeightFeedback(null);
  };

  const { macros, bestGoal, goalState, suggestions: goalSuggestions } = macrosAndState;

  const progressStats = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const MS30 = 30 * 86400000;
    const last30 = workoutHistory.filter(s => now - new Date(s.date).getTime() < MS30);
    const prev30 = workoutHistory.filter(s => { 
      const d = now - new Date(s.date).getTime(); 
      return d >= MS30 && d < 2 * MS30; 
    });

    const avgEff = (sessions: WorkoutSession[]) => sessions.length ? Math.round(sessions.reduce((a, s) => a + s.efficiencyScore, 0) / sessions.length) : 0;
    const totalVol = (sessions: WorkoutSession[]) => Math.round(sessions.reduce((acc, s) => acc + s.exercises.reduce((a, e) => a + e.loggedSets.filter(ls => ls.completed).reduce((v, ls) => v + ls.reps * ls.weightKg, 0), 0), 0));

    const delta = (a: number, b: number) => b === 0 ? null : Math.round(((a - b) / b) * 100);
    
    return {
      last30,
      prev30,
      sessionDelta: delta(last30.length, prev30.length),
      effDelta: delta(avgEff(last30), avgEff(prev30)),
      volDelta: delta(totalVol(last30), totalVol(prev30)),
      last30Eff: avgEff(last30),
      prev30Eff: avgEff(prev30),
      last30Vol: totalVol(last30),
      prev30Vol: totalVol(prev30)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutHistory, refreshKey]);

  const { last30, prev30, sessionDelta, effDelta, volDelta, last30Eff, last30Vol } = progressStats;

  const dismissQuarterly = () => {
    if (!profile) return;
    setProfile({ ...profile, lastReviewAt: new Date().toISOString() });
  };

  const muscleData = useMemo(() =>
    Object.entries(analysis.totalSetsPerMuscle)
      .map(([muscle, sets]) => ({
        id: muscle as MuscleGroup,
        muscle: getMuscleLabel(muscle as MuscleGroup, language),
        sets: Math.round(sets as number),
        fullMark: 25
      }))
      .filter(d => d.sets > 0 || CORE_DISPLAY_MUSCLES.includes(d.id)),
    [analysis, language]);

  if (!isHydrated) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">

      {isReviewDue && (
        <div className="flex items-center justify-between p-4 mb-6 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-3">
            <RefreshCcw className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{t.prog_quarterly_banner}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/onboarding?review=true">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white dark:text-black">{t.prog_quarterly_btn}</Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={dismissQuarterly} className="text-amber-600"><Minus className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {isWeightUpdateDue && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 mb-6 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 gap-3">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{t.weight_update_banner as string}</p>
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Input 
              type="number" 
              value={newWeightInput}
              onChange={(e) => setNewWeightInput(e.target.value)}
              placeholder={profile?.weightKg ? getWeightInUnit(profile.weightKg, weightUnit).toFixed(1) : "0"}
              className="w-24"
            />
            <span className="text-sm font-medium">{weightUnit}</span>
            <Button size="sm" onClick={() => handleSaveWeight(newWeightInput)} className="bg-blue-500 hover:bg-blue-600 text-white dark:text-black">
              {t.weight_update_btn}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 flex">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t.weight_current}</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                  {profile?.weightKg ? getWeightInUnit(profile.weightKg, weightUnit).toFixed(1).replace(/\.0$/, '') : 0} <span className="text-sm font-normal text-zinc-500">{weightUnit}</span>
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
               const newW = prompt(language === "es" ? `Ingresa tu nuevo peso (${weightUnit}):` : `Enter your new weight (${weightUnit}):`, profile?.weightKg ? getWeightInUnit(profile.weightKg, weightUnit).toFixed(1).replace(/\.0$/, '') : '');
               if (newW) handleSaveWeight(newW);
            }} className="border-zinc-200 dark:border-zinc-700">
              <RefreshCcw className="w-4 h-4 mr-2" />
              {t.weight_update_btn}
            </Button>
          </CardContent>
        </Card>
      </div>

      {weightFeedback && (
        <div className={`mb-8 p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-2 duration-500 ${
          weightFeedback.type === 'good' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' 
            : weightFeedback.type === 'neutral'
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400'
              : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
        }`}>
          {weightFeedback.type === 'good' ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />}
          <div className="flex-1">
            <p className="text-sm font-medium">{weightFeedback.message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setWeightFeedback(null)} className={
            weightFeedback.type === 'good' ? 'text-emerald-600' : weightFeedback.type === 'neutral' ? 'text-amber-600' : 'text-red-600'
          }>
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {macros && bestGoal && (
        <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-200 dark:border-emerald-800/40 mb-8 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  🥗 {t.macros_section}
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400 text-sm">{t.macros_desc}</CardDescription>
              </div>
              <div className="text-right">
                <Select 
                  value={macros.goal} 
                  onValueChange={(v) => handleGoalPick(v as FitnessGoal)}
                >
                  <SelectTrigger className="h-8 border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono px-3 rounded-full w-auto hover:bg-emerald-500/10 transition-colors">
                    <SelectValue>{goalLabel(macros.goal, language)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cutting">{goalLabel('cutting', language)}</SelectItem>
                    <SelectItem value="maintenance">{goalLabel('maintenance', language)}</SelectItem>
                    <SelectItem value="bulking">{goalLabel('bulking', language)}</SelectItem>
                  </SelectContent>
                </Select>

                {goalState === 'pending' && bestGoal && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                    {language === 'es' ? 'Sugerido: ' : 'Suggested: '}{goalLabel(bestGoal, language)}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {goalState !== 'pending' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: t.macros_calories, value: `${macros.calories} kcal`, unit: t.macros_per_day, color: 'text-orange-500', icon: '🔥' },
                  { label: t.macros_protein, value: `${macros.protein}g`, unit: '', color: 'text-blue-500', icon: '💪' },
                  { label: t.macros_carbs, value: `${macros.carbs}g`, unit: '', color: 'text-amber-500', icon: '🌾' },
                  { label: t.macros_fat, value: `${macros.fat}g`, unit: '', color: 'text-pink-500', icon: '🍋' },
                ].map(macro => (
                  <div key={macro.label} className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-2xl mb-1">{macro.icon}</div>
                    <div className={`text-2xl font-bold ${macro.color}`}>{macro.value}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{macro.label} {macro.unit && <span className="text-[10px] font-mono opacity-70">/ {macro.unit}</span>}</div>
                  </div>
                ))}
              </div>
            )}

            {goalState === 'pending' && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <p className="text-base font-bold text-amber-800 dark:text-amber-400 mb-4">
                  ⚖️ {language === 'es' ? 'Se ha registrado un nuevo peso. ¿En qué fase te encuentras?' : 'New weight recorded. Which phase are you in?'}
                </p>
                <div className="flex gap-3 flex-wrap justify-center">
                  {bestGoal && (
                    <Button onClick={() => handleGoalPick(bestGoal)} className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black shrink-0">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> {goalLabel(bestGoal, language)}
                    </Button>
                  )}
                  {(['cutting', 'maintenance', 'bulking'] as FitnessGoal[]).filter(g => g !== bestGoal).map((g: FitnessGoal) => (
                    <Button
                      key={g}
                      onClick={() => handleGoalPick(g)}
                      variant="outline"
                      className="border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300"
                    >
                      {g === 'cutting' ? `📉 ${language === 'es' ? 'Definición' : 'Cutting'}` : g === 'bulking' ? `📈 ${language === 'es' ? 'Volumen' : 'Bulking'}` : `⚖️ ${language === 'es' ? 'Mantenimiento' : 'Maintenance'}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {goalState === 'mismatch' && (
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
                <Button onClick={() => handleGoalPick(bestGoal)} className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black text-xs">
                  {language === 'es' ? 'Actualizar a objetivo sugerido' : 'Update to suggested goal'}
                </Button>
              </div>
            )}

            {goalState === 'confirmed' && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {t.macros_goal_aligned}
                  </p>
                </div>
                {goalSuggestions.length > 0 && (
                  <div className="bg-white/50 dark:bg-zinc-900/50 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                    <ul className="space-y-1.5">
                      {goalSuggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-300">
                          <span className="text-blue-400 mt-0.5">▶</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {workoutHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">{t.prog_title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { label: t.prog_sessions, current: last30.length, prev: prev30.length, d: sessionDelta, fmt: (v: number) => v.toString() },
              { label: t.prog_avg_eff, current: last30Eff, prev: progressStats.prev30Eff, d: effDelta, fmt: (v: number) => `${v}` },
              { label: t.prog_volume, current: last30Vol, prev: progressStats.prev30Vol, d: volDelta, fmt: (v: number) => formatWeight(v, weightUnit) },
            ] as const).map(({ label, current, prev: _, d, fmt }) => (
              <Card key={label} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{fmt(current)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {d === null ? <Minus className="w-3 h-3 text-zinc-400" /> : d > 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : d < 0 ? <TrendingDown className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3 text-zinc-400" />}
                    <span className={`text-xs ${d === null ? 'text-zinc-400' : d > 0 ? 'text-emerald-500' : d < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                      {d === null ? '—' : `${d > 0 ? '+' : ''}${d}%`}
                    </span>
                    <span className="text-xs text-zinc-400">vs {t.prog_last_month}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* --- Resumen de Cardio Independiente --- */}
      {analysis.totalCardioMinutes > 0 && (
        <Card className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-200 dark:border-blue-800/40 mb-8 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">{language === 'es' ? 'Actividad Cardiovascular' : 'Cardio Activity'}</h3>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                  {Math.floor(analysis.totalCardioMinutes / 60)}h {Math.round(analysis.totalCardioMinutes % 60)}m 
                  <span className="text-sm font-normal opacity-60 ml-2">/ {language === 'es' ? 'semana' : 'week'}</span>
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{language === 'es' ? 'Carga Interna Estimada' : 'Estimated Internal Load'}</p>
              <p className="text-sm font-bold text-zinc-500">~{Math.round(analysis.totalSetsWeekly - Object.values(analysis.totalSetsPerMuscle).reduce((a,b)=>a+b,0))} {t.heat_sets} equiv.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{t.dash_title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">{t.dash_subtitle}</p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-1 bg-emerald-500 rounded-full" />
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.dash_strength_section}</h2>
      </div>

      {showMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          title={t.dash_weekly_sets} 
          value={Math.round(Object.values(analysis.totalSetsPerMuscle).reduce((a, b) => a + b, 0)).toString()} 
          icon={<Activity className="text-emerald-500 dark:text-emerald-400" />} 
          description={t.dash_weekly_sets_desc}
        />
        <MetricCard 
          title={t.dash_est_duration} 
          value={`${analysis.estimatedDurationMins}m`} 
          icon={<Clock className="text-blue-500 dark:text-blue-400" />} 
          description={t.dash_est_duration_desc}
        />
        <ScoreCard 
          title={t.dash_balance_score} 
          score={analysis.balanceScore} 
          icon={<Target className="text-purple-500 dark:text-purple-400" />} 
        />
        <ScoreCard 
          title={t.dash_efficiency_score} 
          score={analysis.efficiencyScore} 
          icon={<CheckCircle2 className="text-emerald-500 dark:text-emerald-400" />} 
        />
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-zinc-50">{t.dash_vol_title}</CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">{t.dash_vol_desc}</CardDescription>
          </CardHeader>
          <CardContent className="h-80 w-full min-w-0 relative">
            <div className="w-full h-full min-w-0 min-h-0 absolute inset-0 p-4">
              <ResponsiveContainer key={muscleData.length} width="99%" height="100%">
                <BarChart data={muscleData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="muscle" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#27272a' }}
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                  />
                  <Bar dataKey="sets" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-zinc-50">{t.dash_bal_chart_title}</CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">{t.dash_bal_chart_desc}</CardDescription>
          </CardHeader>
          <CardContent className="h-80 w-full min-w-0 relative flex items-center justify-center">
            <div className="w-full h-full min-w-0 min-h-0 absolute inset-0 p-4">
              <ResponsiveContainer key={muscleData.length} width="99%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={muscleData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="muscle" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} tick={false} axisLine={false} />
                  <Radar name="Sets" dataKey="sets" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-zinc-50">{t.dash_heat_title}</CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">{t.dash_heat_desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {HEATMAP_MUSCLES.map(muscle => {
                const sets = analysis.totalSetsPerMuscle[muscle] || 0;
                let intensityClass = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-transparent";
                if (sets > 0 && sets <= 8) intensityClass = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800/50";
                if (sets > 8 && sets <= 15) intensityClass = "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-500";
                if (sets > 15) intensityClass = "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black font-medium";
                
                return (
                  <div key={muscle} className={`px-3 py-2 rounded-lg border flex flex-col min-w-[90px] flex-1 text-center transition-colors ${intensityClass}`}>
                    <span className="text-xs">{getMuscleLabel(muscle, language)}</span>
                    <span className="text-lg font-bold mt-0.5">{Math.round(sets)} <span className="text-[10px] font-normal opacity-70">{t.heat_sets}</span></span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6 text-xs text-zinc-500 dark:text-zinc-400 justify-center">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-zinc-100 border border-zinc-200 dark:border-transparent dark:bg-zinc-800"></div> {t.heat_zero}</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200 dark:border-transparent dark:bg-emerald-900/40"></div> {t.heat_light}</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-500 dark:border-transparent dark:bg-emerald-600"></div> {t.heat_optimal}</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-600 border border-emerald-600 dark:border-transparent dark:bg-emerald-500"></div> {t.heat_high}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-zinc-50">{t.dash_ins_title}</CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">{t.dash_ins_desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.warnings.length === 0 && analysis.suggestions.length === 0 && days.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{t.dash_ins_solid}</p>
              </div>
            )}
            
            {analysis.warnings.map((warning, i) => (
              <div key={`w-${i}`} className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{warning}</p>
              </div>
            ))}

            {analysis.suggestions.map((suggestion, i) => (
              <div key={`s-${i}`} className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{suggestion}</p>
              </div>
            ))}
            
            {days.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                {t.dash_ins_nodata}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-zinc-500 dark:text-zinc-400">{title}</h3>
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">{icon}</div>
        </div>
        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{value}</div>
        <p className="text-xs text-zinc-500 mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}

function ScoreCard({ title, score, icon }: { title: string, score: number, icon: React.ReactNode }) {
  const isGood = score >= 80;
  const isWarning = score >= 50 && score < 80;
  const colorClass = isGood ? "text-emerald-600 dark:text-emerald-400" : isWarning ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
  const indicatorClass = isGood ? "bg-emerald-500" : isWarning ? "bg-yellow-500" : "bg-red-500";

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-zinc-500 dark:text-zinc-400">{title}</h3>
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">{icon}</div>
        </div>
        <div className="flex items-end gap-2">
          <div className={`text-3xl font-bold ${colorClass}`}>{score}</div>
          <div className="text-sm text-zinc-500 mb-1">/ 100</div>
        </div>
        <Progress value={score} className="mt-3 h-1.5 bg-zinc-100 dark:bg-zinc-800" indicatorClass={indicatorClass} />
      </CardContent>
    </Card>
  );
}
