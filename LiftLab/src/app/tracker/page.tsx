"use client";

import { useStore, WorkoutDay, LoggedExercise, LoggedSet, WorkoutSession, UserProfile, RoutineExercise } from "@/store/useStore";
import { formatWeight, formatDistance, formatSpeed, getWeightInUnit, getDistanceInUnit, convertWeightInputToKg, convertDistanceInputToKm } from "@/lib/units";
import { EXERCISE_DATABASE, getExerciseName, MuscleGroup, ExerciseDef, GripType } from "@/lib/exercises";
import { translations } from "@/lib/i18n";
import { getSessionVolume, getExVolume, getTrend, getVolumeAlerts, calcEfficiencyScore, PRType, checkPRs } from "@/lib/workout-logic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CheckCircle2, ChevronRight, Clock, Dumbbell, Play, Trophy, X, Check, Minus, Plus, Flame, Calendar as CalendarIcon, ChevronLeft, Activity, TrendingUp, TrendingDown, Info, AlertTriangle, Trash2, Pencil, ChevronUp, ChevronDown, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MUSCLE_NAMES_ES: Partial<Record<MuscleGroup, string>> = {
  Chest: "Pecho", "Upper Chest": "Pecho Superior", Lats: "Dorsales",
  "Upper Back": "Espalda Alta", "Lower Back": "Lumbar",
  Traps: "Trapecio", "Serratus": "Serrato",
  "Front Delts": "Deltoides Anterior", "Lateral Delts": "Deltoides Lateral",
  "Rear Delts": "Deltoides Posterior", Biceps: "Bíceps", Triceps: "Tríceps",
  Forearms: "Antebrazos", Quads: "Cuádriceps", Hamstrings: "Isquiosurales",
  Glutes: "Glúteos", Calves: "Gemelos", Abs: "Abdominales", Obliques: "Oblicuos",
  Adductors: "Aductores",
  ["Tibialis" as MuscleGroup]: "Tibial",
  ["Brachialis" as MuscleGroup]: "Braquial",
  ["Cardio" as MuscleGroup]: "Cardio",
  ["Psoas" as MuscleGroup]: "Psoas",
};

type TrainingObjective = NonNullable<UserProfile['trainingObjective']>;

function getMuscleLabel(muscle: MuscleGroup, lang: "en" | "es") {
  return lang === "es" ? (MUSCLE_NAMES_ES[muscle] ?? muscle) : muscle;
}


function TrendArrow({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />;
  return <Minus className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
}




function HistoryCalendar({ history, onBack, language, customExercises }: { history: WorkoutSession[], onBack: () => void, language: 'en' | 'es', customExercises: ExerciseDef[] }) {
  const { weightUnit, distanceUnit } = useStore();
  const speedUnit = distanceUnit === 'mi' ? 'mi/h' : 'km/h';
  const t = translations[language];
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const monthName = viewDate.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' });

  const sessionsMap = useMemo(() => {
    const map: Record<number, WorkoutSession[]> = {};
    history.forEach(s => {
      const d = new Date(s.date);
      if (d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear()) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(s);
      }
    });
    return map;
  }, [history, viewDate]);

  const getPrevSessionVolume = (session: WorkoutSession) => {
    const sameDay = history
      .filter(s => s.dayId === session.dayId && new Date(s.date).getTime() < new Date(session.date).getTime())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sameDay.length > 0 ? getSessionVolume(sameDay[0], [...EXERCISE_DATABASE, ...customExercises]) : 0;
  };

  const getPrevExVolume = (session: WorkoutSession, exId: string) => {
    const sameDay = history
      .filter(s => s.dayId === session.dayId && new Date(s.date).getTime() < new Date(session.date).getTime())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sameDay.length === 0) return 0;
    const prevEx = sameDay[0].exercises.find(e => e.exerciseId === exId);
    return prevEx ? getExVolume(prevEx) : 0;
  };

  const sessionPRs = useMemo(() => {
    if (!selectedSession) return { count: 0, types: [] as PRType[] };
    const data = checkPRs(selectedSession, history, [...EXERCISE_DATABASE, ...customExercises]);
    const allTypes = Object.values(data).flat();
    return {
      count: allTypes.length,
      types: Array.from(new Set(allTypes))
    };
  }, [selectedSession, history, customExercises]);

  const sessionAlerts = selectedSession ? getVolumeAlerts(selectedSession, history, [...EXERCISE_DATABASE, ...customExercises], language) : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="text-zinc-500">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {language === 'es' ? 'Volver' : 'Back'}
        </Button>
        <h2 className="text-xl font-bold capitalize">{monthName}</h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-8">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => <div key={d} className="text-center text-[10px] font-bold text-zinc-400 py-2">{d}</div>)}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const hasWorkout = sessionsMap[day]?.length > 0;
          return (
            <button
              key={day}
              onClick={() => hasWorkout && setSelectedSession(sessionsMap[day][0])}
              className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${hasWorkout ? 'bg-emerald-500 text-white font-bold shadow-sm hover:scale-105' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selectedSession ? (
        <Card className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-500/5">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{selectedSession.dayName}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-zinc-500">{new Date(selectedSession.date).toLocaleDateString()} · {Math.round(selectedSession.durationSecs / 60)}m</p>
                  <div className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                    {formatWeight(getSessionVolume(selectedSession, [...EXERCISE_DATABASE, ...customExercises]), weightUnit)}
                    <TrendArrow trend={getTrend(getSessionVolume(selectedSession, [...EXERCISE_DATABASE, ...customExercises]), getPrevSessionVolume(selectedSession))} />
                  </div>
                </div>
              </div>
              <Badge className="bg-emerald-500">{selectedSession.efficiencyScore}% Eff</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionPRs.count > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-600 text-[9px] uppercase font-bold">
                  <Trophy className="w-3 h-3 mr-1" /> {sessionPRs.count} PRs ({sessionPRs.types.join(', ')})
                </Badge>
              </div>
            )}

            {selectedSession.exercises.map((ex, i) => {
              const def = [...EXERCISE_DATABASE, ...customExercises].find(e => e.id === ex.exerciseId);
              const completedSets = ex.loggedSets.filter(s => s.completed);
              if (completedSets.length === 0) return null;
              const isCardio = def?.category.includes('Cardio');

              // Cálculos de métricas
              const vol = completedSets.reduce((a, b) => a + (b.reps * b.weightKg), 0);
              const reps = completedSets.reduce((a, b) => a + b.reps, 0);
              const kgPerRep = reps > 0 ? (vol / reps) : 0;

              const speeds = completedSets.map(s => s.weightKg > 0 ? (s.reps / (s.weightKg / 3600)) : 0);
              const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

              const getCardioType = (spd: number) => {
                if (spd >= 10) return language === 'es' ? 'Avanzado' : 'Intense';
                if (spd >= 6) return language === 'es' ? 'Moderado' : 'Moderate';
                return language === 'es' ? 'Suave' : 'Soft';
              };

              return (
                <div key={i} className="border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                        {def ? getExerciseName(def, language) : (t.build_unknown_ex || 'Ejerc.')}
                      </span>
                      {isCardio ? (
                        <span className="text-[10px] text-blue-500 font-bold uppercase">{getCardioType(avgSpeed)} · {avgSpeed.toFixed(1)} {speedUnit} avg</span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">{formatWeight(kgPerRep, weightUnit, false, 2)} {weightUnit}/rep</span>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 font-mono font-bold leading-none">
                        {isCardio
                          ? `${formatDistance(reps, distanceUnit)} total`
                          : formatWeight(vol, weightUnit)}
                      </span>
                      {!isCardio && <TrendArrow trend={getTrend(vol, getPrevExVolume(selectedSession, ex.exerciseId))} />}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {completedSets.map((s, si) => {
                      return (
                        <div key={si} className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                          {isCardio
                            ? `${formatDistance(s.reps, distanceUnit, false)} ${distanceUnit} @ ${Math.floor(s.weightKg / 3600)}:${Math.floor((s.weightKg % 3600) / 60).toString().padStart(2, '0')} (${formatSpeed(s.reps, s.weightKg, distanceUnit)})`
                            : `${s.reps} × ${formatWeight(s.weightKg, weightUnit)}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {sessionAlerts.map((alert, i) => (
              <div key={i} className="mt-4 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 flex gap-2.5 items-start">
                <Info className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {alert}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-10 text-zinc-400 text-sm border-2 border-dashed rounded-2xl">{language === 'es' ? 'Selecciona un día con entrenamiento' : 'Select a day with workout'}</div>
      )}
    </div>
  );
}

function ExerciseProgressView({ history, onBack, language, customExercises }: { history: WorkoutSession[], onBack: () => void, language: 'en' | 'es', customExercises: ExerciseDef[] }) {
  const { weightUnit, distanceUnit } = useStore();
  const speedUnit = distanceUnit === 'mi' ? 'mi/h' : 'km/h';
  const [selectedExId, setSelectedExId] = useState<string>("");
  const allExercises = useMemo(() => [...EXERCISE_DATABASE, ...customExercises], [customExercises]);
  const selectedDef = allExercises.find(e => e.id === selectedExId);
  const isCardio = selectedDef?.category.includes('Cardio');

  const exerciseOptions = useMemo(() => {
    const ids = new Set<string>();
    history.forEach(s => s.exercises.forEach(e => ids.add(e.exerciseId)));
    return Array.from(ids).map(id => {
      const def = allExercises.find(ex => ex.id === id);
      return {
        id,
        name: def ? getExerciseName(def, language) : id
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [history, allExercises, language]);

  const chartData = useMemo(() => {
    if (!selectedExId) return [];
    return history
      .filter(s => s.exercises.some(e => e.exerciseId === selectedExId))
      .map(s => {
        const ex = s.exercises.find(e => e.exerciseId === selectedExId)!;
        const completed = ex.loggedSets.filter(ls => ls.completed);

        if (isCardio) {
          const totalDist = completed.reduce((acc, ls) => acc + ls.reps, 0);
          const totalSecs = completed.reduce((acc, ls) => acc + ls.weightKg, 0);
          const avgSpeed = totalSecs > 0 ? (totalDist / (totalSecs / 3600)) : 0;
          return {
            date: new Date(s.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }),
            distance: getDistanceInUnit(totalDist, distanceUnit),
            time: totalSecs / 60, // en minutos para el gráfico
            speed: getDistanceInUnit(avgSpeed, distanceUnit),
            speedDev: completed.length > 1
              ? getDistanceInUnit(Math.sqrt(completed.map(ls => ls.weightKg > 0 ? (ls.reps / (ls.weightKg / 3600)) : 0).reduce((acc, s) => acc + Math.pow(s - avgSpeed, 2), 0) / completed.length), distanceUnit)
              : 0,
            sets: completed.length,
            volume: undefined,
            weight: undefined,
            weightPerRep: undefined,
            rawDate: new Date(s.date).getTime()
          };
        }

        const totalVol = completed.reduce((acc, ls) => acc + (ls.reps * ls.weightKg), 0);
        const maxWeight = Math.max(...completed.map(ls => ls.weightKg), 0);
        const totalReps = completed.reduce((acc, ls) => acc + ls.reps, 0);

        return {
          date: new Date(s.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }),
          volume: getWeightInUnit(totalVol, weightUnit),
          weight: getWeightInUnit(maxWeight, weightUnit),
          weightPerRep: totalReps > 0 ? getWeightInUnit(totalVol / totalReps, weightUnit) : 0,
          sets: completed.length,
          speedDev: undefined,
          distance: undefined,
          time: undefined,
          speed: undefined,
          rawDate: new Date(s.date).getTime()
        };
      })
      .sort((a, b) => a.rawDate - b.rawDate);
  }, [selectedExId, history, language, weightUnit, distanceUnit, isCardio]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="text-zinc-500">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {language === 'es' ? 'Volver' : 'Back'}
        </Button>
        <h2 className="text-xl font-bold">{language === 'es' ? 'Análisis de Progreso' : 'Progress Analysis'}</h2>
        <div className="w-10" />
      </div>

      <div className="mb-8">
        <Label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">{language === 'es' ? 'Seleccionar Ejercicio' : 'Select Exercise'}</Label>
        <select
          className="w-full h-10 px-3 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          value={selectedExId}
          onChange={(e) => setSelectedExId(e.target.value)}
        >
          <option value="" disabled>{language === 'es' ? 'Elegir ejercicio...' : 'Choose exercise...'}</option>
          {exerciseOptions.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
      </div>

      {selectedExId && chartData.length > 0 ? (
        <div className="space-y-8">
          <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
                  {isCardio ? (
                    <>
                      <Line yAxisId="left" type="monotone" dataKey="distance" name={language === 'es' ? `Distancia (${distanceUnit})` : `Distance (${distanceUnit})`} stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="speed" name={language === 'es' ? `Velocidad (${speedUnit})` : `Speed (${speedUnit})`} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                      <Line yAxisId="left" type="monotone" dataKey="time" name={language === 'es' ? 'Tiempo (min)' : 'Time (min)'} stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="speedDev" name={language === 'es' ? 'Desvío Vel.' : 'Speed Dev.'} stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="sets" name={language === 'es' ? 'Intervalos' : 'Intervals'} stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    </>
                  ) : (
                    <>
                      <Line yAxisId="left" type="monotone" dataKey="volume" name={language === 'es' ? `Volumen (${weightUnit})` : `Volume (${weightUnit})`} stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="weight" name={language === 'es' ? `Peso Máx (${weightUnit})` : `Max Weight (${weightUnit})`} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="weightPerRep" name={language === 'es' ? `${weightUnit}/Rep` : `${weightUnit}/Rep`} stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="sets" name={language === 'es' ? 'Series' : 'Sets'} stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-zinc-400 uppercase font-bold bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3">{language === 'es' ? 'Fecha' : 'Date'}</th>
                    <th className="px-4 py-3 text-center">{language === 'es' ? (isCardio ? 'Intervalos' : 'Series') : (isCardio ? 'Intervals' : 'Sets')}</th>
                    {isCardio ? (
                      <>
                        <th className="px-4 py-3 text-center">{language === 'es' ? 'Distancia' : 'Distance'}</th>
                        <th className="px-4 py-3 text-center">{language === 'es' ? 'Tiempo' : 'Time'}</th>
                        <th className="px-4 py-3 text-center">{language === 'es' ? 'Velocidad' : 'Speed'}</th>
                        <th className="px-4 py-3 text-right">{language === 'es' ? 'Desvío' : 'Dev.'}</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-center">{language === 'es' ? 'Peso Máx' : 'Max Weight'}</th>
                        <th className="px-4 py-3 text-center">{language === 'es' ? `${weightUnit}/Rep` : `${weightUnit}/Rep`}</th>
                        <th className="px-4 py-3 text-right">{language === 'es' ? 'Volumen' : 'Volume'}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {[...chartData].reverse().map((d, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                      <td className="px-4 py-3 font-medium">{d.date}</td>
                      <td className="px-4 py-3 text-center">{d.sets}</td>
                      {isCardio ? (
                        <>
                          <td className="px-4 py-3 text-center">{d.distance?.toLocaleString()} {distanceUnit}</td>
                          <td className="px-4 py-3 text-center">{Math.floor(d.time! / 60)}h {Math.round(d.time! % 60)}m</td>
                          <td className="px-4 py-3 text-center font-mono text-blue-600 dark:text-blue-400">{d.speed?.toLocaleString()} {speedUnit}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-500 dark:text-red-400">{d.speedDev?.toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-center">{d.weight?.toLocaleString()} {weightUnit}</td>
                          <td className="px-4 py-3 text-center">{d.weightPerRep?.toFixed(2)} {weightUnit}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{d.volume?.toLocaleString()} {weightUnit}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <TrendingUp className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500">
            {selectedExId
              ? (language === 'es' ? 'No hay suficientes datos para este ejercicio.' : 'Not enough data for this exercise.')
              : (language === 'es' ? 'Selecciona un ejercicio para ver su progreso.' : 'Select an exercise to see its progress.')
            }
          </p>
        </div>
      )}
    </div>
  );
}

function BodyMetricsScreen({ onDone }: { onDone: () => void }) {
  const profile = useStore(s => s.profile) as UserProfile | null;
  const setProfile = useStore(s => s.setProfile);
  const { language, weightUnit } = useStore();
  const t = translations[language];
  const [heightCm, setHeightCm] = useState(profile?.heightCm?.toString() || '');
  const [weightInput, setWeightInput] = useState(profile?.weightKg ? getWeightInUnit(profile.weightKg, weightUnit).toFixed(1).replace(/\.0$/, '') : '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender || 'male');

  const [trainingHours, setTrainingHours] = useState(profile?.trainingHoursWeekly?.toString() || '4');
  const [objective, setObjective] = useState<'hypertrophy' | 'strength' | 'endurance'>(profile?.trainingObjective || 'hypertrophy');
  const [proteinPref, setProteinPref] = useState(profile?.proteinPreferenceGPerKg?.toString() || '1.8');

  const weightKg = weightInput ? convertWeightInputToKg(parseFloat(weightInput), weightUnit) : 0;
  const canContinue = parseFloat(heightCm) >= 100 && parseFloat(heightCm) <= 250 &&
    weightKg >= 30 && weightKg <= 300 &&
    parseInt(age) >= 12 && parseInt(age) <= 100;

  const handleSave = () => {
    const h = parseFloat(heightCm);
    const a = parseInt(age);
    if (!canContinue) return;
    setProfile({
      strengths: profile?.strengths ?? [],
      goals: profile?.goals ?? [],
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      ...profile,
      heightCm: h,
      weightKg: weightKg,
      age: a,
      gender: gender,
      trainingHoursWeekly: parseFloat(trainingHours),
      trainingObjective: objective,
      proteinPreferenceGPerKg: parseFloat(proteinPref),
      lastReviewAt: new Date().toISOString(), // Actualizamos la fecha de revisión al guardar
    });
    onDone();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        <Dumbbell className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">{t.macros_ask_weight && t.macros_ask_height ? t.macros_section : 'Your Body Metrics'}</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">
        {language === 'es'
          ? 'Necesitamos tus datos para calcular tus macros personalizadas usando la fórmula de Harris-Benedict.'
          : 'We need your data to calculate personalized macros using the Harris-Benedict formula.'}
      </p>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="grid gap-2">
          <Label>{language === 'es' ? 'Género' : 'Gender'}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={gender === 'male' ? 'default' : 'outline'}
              className={`flex-1 ${gender === 'male' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
              onClick={() => setGender('male')}
            >
              {language === 'es' ? 'Hombre' : 'Male'}
            </Button>
            <Button
              type="button"
              variant={gender === 'female' ? 'default' : 'outline'}
              className={`flex-1 ${gender === 'female' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
              onClick={() => setGender('female')}
            >
              {language === 'es' ? 'Mujer' : 'Female'}
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="age">{language === 'es' ? 'Edad' : 'Age'}</Label>
          <Input
            id="age"
            type="number"
            min={12}
            max={100}
            placeholder="ej. 25"
            value={age}
            onChange={e => setAge(e.target.value)}
            className="bg-white dark:bg-zinc-950"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="height">{t.macros_ask_height}</Label>
          <Input
            id="height"
            type="number"
            min={100}
            max={250}
            placeholder={language === 'es' ? 'ej. 175' : 'e.g. 175'}
            value={heightCm}
            onChange={e => setHeightCm(e.target.value)}
            className="bg-white dark:bg-zinc-950"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="weight">{t.macros_ask_weight} ({weightUnit})</Label>
          <Input
            id="weight"
            type="number"
            min={weightUnit === 'lbs' ? 66 : 30}
            max={weightUnit === 'lbs' ? 660 : 300}
            step="0.1"
            placeholder={language === 'es' ? (weightUnit === 'lbs' ? 'ej. 160' : 'ej. 72.5') : (weightUnit === 'lbs' ? 'e.g. 160' : 'e.g. 72.5')}
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            className="bg-white dark:bg-zinc-950"
          />
        </div>
        <div className="grid gap-2 text-left">
          <Label>{language === 'es' ? 'Horas de Entreno Semanal' : 'Weekly Training Hours'}</Label>
          <Input
            type="number"
            value={trainingHours}
            onChange={e => setTrainingHours(e.target.value)}
            className="bg-white dark:bg-zinc-950"
          />
        </div>
        <div className="grid gap-2 text-left">
          <Label>{language === 'es' ? 'Objetivo Principal' : 'Primary Objective'}</Label>
          <select
            className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
            value={objective}
            onChange={e => setObjective(e.target.value as TrainingObjective)}
          >
            <option value="hypertrophy">{language === 'es' ? 'Hipertrofia' : 'Hypertrophy'}</option>
            <option value="strength">{language === 'es' ? 'Fuerza' : 'Strength'}</option>
            <option value="endurance">{language === 'es' ? 'Resistencia' : 'Endurance'}</option>
          </select>
        </div>
        <div className="grid gap-2 text-left">
          <Label>
            {language === 'es' ? 'Proteína deseada' : 'Target Protein'} ({proteinPref} g/kg)
          </Label>
          <input
            type="range"
            min="1.2"
            max="2.5"
            step="0.1"
            value={proteinPref}
            onChange={e => setProteinPref(e.target.value)}
            className="w-full accent-emerald-500"
          />
          <p className="text-[10px] text-zinc-400">Rec: 1.6 - 1.8 g/kg</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!canContinue}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black disabled:opacity-40"
        >
          {language === 'es' ? 'Continuar' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

function DaySelectionScreen({ onSelect, onViewHistory, onViewProgress }: { onSelect: (day: WorkoutDay) => void, onViewHistory: () => void, onViewProgress: () => void }) {
  const days = useStore(s => s.days);
  const language = useStore(s => s.language);
  const t = translations[language];

  if (days.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Dumbbell className="w-8 h-8 text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">{t.tracker_no_days}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">{t.tracker_no_days_desc}</p>
        <Link href="/builder">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black">
            {language === 'es' ? 'Crear mi rutina' : 'Create my routine'}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{t.tracker_title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">{t.tracker_select_day}</p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onViewHistory} className="text-xs">
            <CalendarIcon className="w-3.5 h-3.5 mr-2" /> {language === 'es' ? 'Ver Historial' : 'View History'}
          </Button>
          <Button variant="outline" size="sm" onClick={onViewProgress} className="text-xs">
            <Activity className="w-3.5 h-3.5 mr-2" /> {language === 'es' ? 'Ver Progreso' : 'View Progress'}
          </Button>
          <Link href="/builder">
            <Button variant="outline" size="sm" className="text-xs">
              <Dumbbell className="w-3.5 h-3.5 mr-2" /> {language === 'es' ? 'Ver mi rutina' : 'View my routine'}
            </Button>
          </Link>
        </div>
      </div>
      <div className="space-y-3">
        {days.map(day => (
          <button
            key={day.id}
            onClick={() => onSelect(day)}
            className="w-full text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{day.name}</h3>
                <p className="text-sm text-zinc-500 mt-0.5">{day.exercises.length} {t.build_exercises}</p>
              </div>
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function InlineExerciseProgress({ exId, history, language }: { exId: string, history: WorkoutSession[], language: 'en' | 'es' }) {
  const { weightUnit, distanceUnit } = useStore();
  const speedUnit = distanceUnit === 'mi' ? 'mi/h' : 'km/h';
  const customExercises = useStore(s => s.customExercises);
  const allExercises = useMemo(() => [...EXERCISE_DATABASE, ...customExercises], [customExercises]);
  const def = allExercises.find(e => e.id === exId);
  const isCardio = def?.category.includes('Cardio');

  const chartData = useMemo(() => {
    return history
      .filter(s => s.exercises.some(e => e.exerciseId === exId))
      .map(s => {
        const ex = s.exercises.find(e => e.exerciseId === exId)!;
        const completed = ex.loggedSets.filter(ls => ls.completed);

        if (isCardio) {
          const totalDist = completed.reduce((acc, ls) => acc + ls.reps, 0);
          const totalSecs = completed.reduce((acc, ls) => acc + ls.weightKg, 0);
          const speed = totalSecs > 0 ? (totalDist / (totalSecs / 3600)) : 0;
          return {
            date: new Date(s.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }),
            distance: getDistanceInUnit(totalDist, distanceUnit),
            time: totalSecs / 60,
            speed: getDistanceInUnit(speed, distanceUnit),
            speedDev: completed.length > 1
              ? getDistanceInUnit(Math.sqrt(completed.map(ls => ls.weightKg > 0 ? (ls.reps / (ls.weightKg / 3600)) : 0).reduce((acc, s) => acc + Math.pow(s - speed, 2), 0) / completed.length), distanceUnit)
              : 0,
            sets: completed.length,
            volume: undefined,
            weight: undefined,
            weightPerRep: undefined,
            rawDate: new Date(s.date).getTime()
          };
        }

        const totalVol = completed.reduce((acc, ls) => acc + (ls.reps * ls.weightKg), 0);
        const maxWeight = Math.max(...completed.map(ls => ls.weightKg), 0);
        const totalReps = completed.reduce((acc, ls) => acc + ls.reps, 0);

        return {
          date: new Date(s.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }),
          volume: getWeightInUnit(totalVol, weightUnit),
          weight: getWeightInUnit(maxWeight, weightUnit),
          weightPerRep: totalReps > 0 ? getWeightInUnit(totalVol / totalReps, weightUnit) : 0,
          sets: completed.length,
          speedDev: undefined,
          distance: undefined,
          time: undefined,
          speed: undefined,
          rawDate: new Date(s.date).getTime()
        };
      })
      .sort((a, b) => a.rawDate - b.rawDate);
  }, [exId, history, language, isCardio, distanceUnit, weightUnit]);

  if (chartData.length === 0) {
    return <div className="text-center text-xs text-zinc-500 py-4">{language === 'es' ? 'No hay datos previos para este ejercicio.' : 'No past data for this exercise.'}</div>;
  }

  return (
    <div className="pt-2">
      <div className="h-40 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} width={30} />
            <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '10px' }} />
            {isCardio ? (
              <>
                <Line yAxisId="left" type="monotone" dataKey="distance" name={language === 'es' ? 'Dist.' : 'Dist.'} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="speed" name={language === 'es' ? speedUnit : speedUnit} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="speedDev" name={language === 'es' ? 'Desvío' : 'Dev.'} stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="sets" name={language === 'es' ? 'Intervalos' : 'Intervals'} stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3 3" dot={false} />
              </>
            ) : (
              <>
                <Line yAxisId="left" type="monotone" dataKey="volume" name={language === 'es' ? 'Volumen' : 'Volume'} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="weight" name={language === 'es' ? `Máx ${weightUnit}` : `Max ${weightUnit}`} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="weightPerRep" name={language === 'es' ? `${weightUnit}/Rep` : `${weightUnit}/Rep`} stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="sets" name={language === 'es' ? 'Series' : 'Sets'} stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3 3" dot={false} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-[10px] text-zinc-400 uppercase font-bold bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-2 py-1.5">{language === 'es' ? 'Fecha' : 'Date'}</th>
              <th className="px-2 py-1.5 text-center">{language === 'es' ? (isCardio ? 'Intervalos' : 'Series') : (isCardio ? 'Intervals' : 'Sets')}</th>
              {isCardio ? (
                <>
                  <th className="px-2 py-1.5 text-center">{language === 'es' ? 'Km' : 'Km'}</th>
                  <th className="px-2 py-1.5 text-center">{language === 'es' ? 'Min' : 'Min'}</th>
                  <th className="px-2 py-1.5 text-center">{speedUnit}</th>
                  <th className="px-2 py-1.5 text-right">±</th>
                </>
              ) : (
                <>
                  <th className="px-2 py-1.5 text-center">{language === 'es' ? `Máx ${weightUnit}` : `Max ${weightUnit}`}</th>
                  <th className="px-2 py-1.5 text-center">{language === 'es' ? `${weightUnit}/Rep` : `${weightUnit}/Rep`}</th>
                  <th className="px-2 py-1.5 text-right">Vol</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...chartData].reverse().slice(0, 3).map((d, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5 font-medium">{d.date}</td>
                <td className="px-2 py-1.5 text-center">{d.sets}</td>
                {isCardio ? (
                  <>
                    <td className="px-2 py-1.5 text-center">{d.distance}</td>
                    <td className="px-2 py-1.5 text-center">{Math.round(d.time!)}</td>
                    <td className="px-2 py-1.5 text-center text-blue-600 dark:text-blue-400 font-mono">{d.speed}</td>
                    <td className="px-2 py-1.5 text-right text-red-500 dark:text-red-400">{d.speedDev?.toFixed(1)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-1.5 text-center">{d.weight?.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-center">{d.weightPerRep?.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right text-emerald-600 dark:text-emerald-400 font-mono">{d.volume?.toLocaleString()}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveWorkout({ day, onFinish, onCancel, onPause }: { day: WorkoutDay; onFinish: (exercises: LoggedExercise[], durationSecs: number) => void; onCancel: () => void; onPause: () => void }) {
  const customExercises = useStore(s => s.customExercises);
  const language = useStore(s => s.language) as "en" | "es";
  const workoutHistory = useStore(s => s.workoutHistory);
  const t = translations[language];
  const allExercises = useMemo(() => [...EXERCISE_DATABASE, ...customExercises], [customExercises]);
  const updateExercisesByExerciseId = useStore(s => s.updateExercisesByExerciseId);
  const activeSession = useStore(s => s.activeSession);
  const setActiveSession = useStore(s => s.setActiveSession);
  const { weightUnit, distanceUnit } = useStore();
  const speedUnit = distanceUnit === 'mi' ? 'mi/h' : 'km/h';

  const [elapsed, setElapsed] = useState(() =>
    (activeSession && activeSession.dayId === day.id) ? activeSession.elapsedSecs : 0
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTargetSecs, setRestTargetSecs] = useState(0);
  const restAlertShownRef = useRef(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const updateExerciseInDay = useStore(s => s.updateExerciseInDay);
  const [activeRestRoutineExId, setActiveRestRoutineExId] = useState<string | null>(null);

  const handleRestSecsChange = useCallback((routineExId: string, delta: number) => {
    const routineEx = day.exercises.find(e => e.id === routineExId);
    if (!routineEx) return;
    const newRest = Math.max(0, routineEx.restSecs + delta);
    updateExerciseInDay(day.id, routineExId, { restSecs: newRest });
    if (isResting && activeRestRoutineExId === routineExId) {
      setRestTargetSecs(newRest);
    }
  }, [day, updateExerciseInDay, isResting, activeRestRoutineExId]);

  // Custom exercise creation state
  const addCustomExercise = useStore(s => s.addCustomExercise);
  const [showCreateExDialog, setShowCreateExDialog] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>('Chest');
  const [newExCategory, setNewExCategory] = useState<string>('Dumbbell');
  const [newExGrip, setNewExGrip] = useState<GripType>('Any');

  const MUSCLE_OPTIONS: MuscleGroup[] = ['Chest', 'Upper Chest', 'Lats', 'Upper Back', 'Lower Back', 'Traps', 'Front Delts', 'Lateral Delts', 'Rear Delts', 'Serratus', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Obliques', 'Adductors'];
  const CATEGORY_OPTIONS = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith Machine', 'Plyometrics'];
  const GRIP_OPTIONS: GripType[] = ['Pronated', 'Supinated', 'Neutral', 'Mixed', 'Wide', 'Close', 'Any'];

  useEffect(() => {
    let restInterval: ReturnType<typeof setInterval> | null = null;
    if (isResting) {
      restInterval = setInterval(() => setRestTime(prev => prev + 1), 1000);
    }
    return () => { if (restInterval) clearInterval(restInterval); };
  }, [isResting]);

  // Rest alert: beep + vibrate when rest target is reached
  useEffect(() => {
    if (isResting && restTargetSecs > 0 && restTime >= restTargetSecs && !restAlertShownRef.current) {
      restAlertShownRef.current = true;
      // Audio beep via Web Audio API
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        // Second beep
        setTimeout(() => {
          try {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1100;
            osc2.type = 'sine';
            gain2.gain.value = 0.3;
            osc2.start();
            osc2.stop(ctx.currentTime + 0.3);
          } catch { /* ignore */ }
        }, 350);
      } catch { /* Web Audio not available */ }
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [isResting, restTime, restTargetSecs]);

  const sessionStartTime = useRef(activeSession?.startTime || new Date().toISOString());

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [day.id]);

  const hasCardio = useMemo(() =>
    day.exercises.some(ex => {
      const def = allExercises.find(e => e.id === ex.exerciseId);
      return def?.category.includes('Cardio');
    }),
    [day.exercises, allExercises]);


  const [thresholds, setThresholds] = useState({
    moderate: 6,
    intense: 10
  });


  const [exercises, setExercises] = useState<LoggedExercise[]>(() => {
    if (activeSession && activeSession.dayId === day.id) {
      return activeSession.exercises;
    }
    return day.exercises.map(ex => {
      const lastSessionWithEx = [...workoutHistory].reverse().find(sess =>
        sess.exercises.some(e => e.exerciseId === ex.exerciseId)
      );
      const lastEx = lastSessionWithEx?.exercises.find(e => e.exerciseId === ex.exerciseId);
      const lastSets = lastEx?.loggedSets || [];

      return {
        exerciseId: ex.exerciseId,
        plannedSets: ex.sets,
        plannedReps: ex.reps,
        loggedSets: Array.from({ length: ex.sets }, (_, si) => {
          const lastSet = lastSets[si] || lastSets[lastSets.length - 1];

          return {
            reps: lastSet ? lastSet.reps : ex.reps,
            weightKg: lastSet ? lastSet.weightKg : (ex.weightKg ?? 0),
            completed: false,
            isWarmup: lastSet ? lastSet.isWarmup : false
          };
        })
      } as LoggedExercise;
    });
  });

  useEffect(() => {
    setActiveSession({
      dayId: day.id,
      dayName: day.name,
      startTime: sessionStartTime.current,
      exercises: exercises,
      elapsedSecs: elapsed
    });
  }, [exercises, elapsed, day.id, day.name, setActiveSession]);

  const addExerciseMidWorkout = (exId: string) => {
    const def = allExercises.find(e => e.id === exId);
    if (!def) return;
    const isC = def.category.includes('Cardio');
    const newEx: LoggedExercise = {
      exerciseId: exId,
      plannedSets: isC ? 1 : 3,
      plannedReps: isC ? 5 : 10,
      loggedSets: Array.from({ length: isC ? 1 : 3 }, () => ({
        reps: isC ? 5 : 10,
        weightKg: isC ? 1800 : 0,
        completed: false,
        isWarmup: false
      }))
    };
    setExercises([...exercises, newEx]);
  };

  const removeExerciseFromSession = (idx: number) => {
    if (confirm(language === 'es' ? '¿Eliminar este ejercicio de la sesión?' : 'Remove this exercise from session?')) {
      setExercises(exercises.filter((_, i) => i !== idx));
    }
  };

  const addSetToExercise = (exIdx: number) => {
    setExercises(exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const lastSet = ex.loggedSets[ex.loggedSets.length - 1];
      return {
        ...ex,
        plannedSets: ex.plannedSets + 1,
        loggedSets: [...ex.loggedSets, {
          reps: lastSet ? lastSet.reps : 10,
          weightKg: lastSet ? lastSet.weightKg : 0,
          completed: false,
          isWarmup: false
        }]
      };
    }));
  };

  const removeSetFromExercise = (exIdx: number, setIdx: number) => {
    setInputStrings(prev => {
      const next = { ...prev };
      delete next[`${exIdx}-${setIdx}-reps`];
      delete next[`${exIdx}-${setIdx}-weightKg`];
      
      const numSets = exercises[exIdx].loggedSets.length;
      for (let si = setIdx + 1; si < numSets; si++) {
        const repsVal = next[`${exIdx}-${si}-reps`];
        if (repsVal !== undefined) {
          next[`${exIdx}-${si - 1}-reps`] = repsVal;
          delete next[`${exIdx}-${si}-reps`];
        }
        const weightVal = next[`${exIdx}-${si}-weightKg`];
        if (weightVal !== undefined) {
          next[`${exIdx}-${si - 1}-weightKg`] = weightVal;
          delete next[`${exIdx}-${si}-weightKg`];
        }
      }
      return next;
    });

    setExercises(exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      return {
        ...ex,
        plannedSets: Math.max(0, ex.plannedSets - 1),
        loggedSets: ex.loggedSets.filter((_, si) => si !== setIdx)
      };
    }));
  };

  const reorderExercise = (oldIndex: number, newIndex: number) => {
    setInputStrings(prev => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const parts = key.split('-');
        if (parts.length === 3) {
          const exIdx = parseInt(parts[0]);
          const setIdx = parts[1];
          const field = parts[2];
          
          let newExIdx = exIdx;
          if (exIdx === oldIndex) {
            newExIdx = newIndex;
          } else if (oldIndex < newIndex && exIdx > oldIndex && exIdx <= newIndex) {
            newExIdx = exIdx - 1;
          } else if (oldIndex > newIndex && exIdx >= newIndex && exIdx < oldIndex) {
            newExIdx = exIdx + 1;
          }
          
          next[`${newExIdx}-${setIdx}-${field}`] = val;
        } else {
          next[key] = val;
        }
      });
      return next;
    });

    const nextExercises = [...exercises];
    const [removed] = nextExercises.splice(oldIndex, 1);
    nextExercises.splice(newIndex, 0, removed);
    setExercises(nextExercises);
  };

  const [latestPR, setLatestPR] = useState<{ exercise: string; type: string } | null>(null);
  const [inputStrings, setInputStrings] = useState<Record<string, string>>({});
  const [expandedProgressEx, setExpandedProgressEx] = useState<string | null>(null);

  const checkSetPR = useCallback((exIdx: number, setIdx: number, updatedExercises: LoggedExercise[]) => {
    const ex = updatedExercises[exIdx];
    const set = ex.loggedSets[setIdx];
    const def = allExercises.find(e => e.id === ex.exerciseId);
    if (def?.category.includes('Cardio')) return { isWeightPR: false, isRepsPR: false, isVolumePR: false };
    const isBodyweight = def?.category === 'Bodyweight';
    const currentSets = ex.loggedSets.filter(s => s.completed);

    const otherSets = ex.loggedSets.filter((s, si) => s.completed && si !== setIdx);
    const sessionMaxWeight = otherSets.length > 0 ? Math.max(...otherSets.map(s => s.weightKg)) : 0;
    const sessionMaxRepsGlobal = otherSets.length > 0 ? Math.max(...otherSets.map(s => s.reps)) : 0;
    const sessionMaxRepsAtWeight = otherSets.filter(s => s.weightKg === set.weightKg).reduce((max, s) => Math.max(max, s.reps), 0);

    let isWeightPR = false;
    let isRepsPR = false;
    let isVolumePR = false;

    let histMaxWeight = 0;
    let histMaxRepsForThisWeight = 0;
    let histMaxVolume = 0;
    let histMaxRepsGlobal = 0;

    workoutHistory.forEach(session => {
      session.exercises.forEach(prevEx => {
        if (prevEx.exerciseId === ex.exerciseId) {
          const prevSets = prevEx.loggedSets.filter(s => s.completed);
          if (prevSets.length === 0) return;

          const pMaxW = Math.max(...prevSets.map(s => s.weightKg), 0);
          const pVol = prevSets.reduce((acc, s) => acc + (s.reps * s.weightKg), 0);
          const pMaxR = Math.max(...prevSets.map(s => s.reps), 0);

          if (pMaxW > histMaxWeight) histMaxWeight = pMaxW;
          if (pVol > histMaxVolume) histMaxVolume = pVol;
          if (pMaxR > histMaxRepsGlobal) histMaxRepsGlobal = pMaxR;

          prevSets.forEach(prevSet => {
            if (prevSet.weightKg > histMaxWeight) histMaxWeight = prevSet.weightKg;
            if (prevSet.reps > histMaxRepsGlobal) histMaxRepsGlobal = prevSet.reps;
            if (!isBodyweight && prevSet.weightKg === set.weightKg && prevSet.reps > histMaxRepsForThisWeight) {
              histMaxRepsForThisWeight = prevSet.reps;
            }
          });
        }
      });
    });

    if (!isBodyweight && set.weightKg > histMaxWeight && set.weightKg > sessionMaxWeight && set.weightKg > 0) {
      isWeightPR = true;
    }

    if (isBodyweight) {
      if (set.reps > histMaxRepsGlobal && set.reps > sessionMaxRepsGlobal && set.reps > 0) isRepsPR = true;
    } else {
      if (set.weightKg > 0 && set.reps > histMaxRepsForThisWeight && set.reps > sessionMaxRepsAtWeight && histMaxRepsForThisWeight > 0) {
        isRepsPR = true;
      }
    }

    const currentVol = currentSets.reduce((acc, s) => acc + (s.reps * s.weightKg), 0);
    const volBeforeThisSet = otherSets.reduce((acc, s) => acc + (s.reps * s.weightKg), 0);
    // El PR de volumen solo se dispara la primera vez que el acumulado de la sesión cruza el récord histórico
    if (currentVol > histMaxVolume && volBeforeThisSet <= histMaxVolume && currentVol > 0) isVolumePR = true;

    return { isWeightPR, isRepsPR, isVolumePR };
  }, [workoutHistory, allExercises]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateSet = useCallback((exIdx: number, setIdx: number, field: keyof LoggedSet, value: number | boolean) => {
    const updated = exercises.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return {
        ...ex,
        loggedSets: ex.loggedSets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s)
      };
    });
    setExercises(updated);

    if (typeof value === 'number') {
      setInputStrings(prev => {
        const next = { ...prev };
        delete next[`${exIdx}-${setIdx}-${field}`];
        return next;
      });
    }

    if (field === 'completed' && value === true) {
      setIsResting(true);
      setRestTime(0);
      restAlertShownRef.current = false;

      // Find rest target for this exercise
      const routineEx = day.exercises.find(e => e.exerciseId === updated[exIdx].exerciseId);
      setRestTargetSecs(routineEx?.restSecs || 0);
      setActiveRestRoutineExId(routineEx?.id || null);

      const currentEx = updated[exIdx];
      const currentSet = currentEx.loggedSets[setIdx];
      const def = allExercises.find(e => e.id === currentEx.exerciseId);

      if (def?.category.includes('Cardio') && currentSet.weightKg > 0) {
        const speed = currentSet.reps / (currentSet.weightKg / 3600);
        let detectedCategory: string = 'Soft Cardio';
        if (speed >= thresholds.intense) detectedCategory = 'Intense Cardio';
        else if (speed >= thresholds.moderate) detectedCategory = 'Moderate Cardio';

        if ((def.category as string) !== detectedCategory) {
          const isCustom = customExercises.some(ce => ce.id === def.id);
          if (isCustom) {
            updateExercisesByExerciseId(def.id, { categoryOverride: detectedCategory as RoutineExercise["categoryOverride"] });
            setLatestPR({
              exercise: getExerciseName(def, language),
              type: language === 'es'
                ? `¡INTENSIDAD ACTUALIZADA A ${detectedCategory === 'Intense Cardio' ? 'AVANZADA' : detectedCategory === 'Moderate Cardio' ? 'MODERADA' : 'SUAVE'}!`
                : `INTENSITY UPDATED TO ${detectedCategory.split(' ')[0].toUpperCase()}!`
            });
            setTimeout(() => setLatestPR(null), 4000);
          }
        }
      }

      const { isWeightPR, isRepsPR, isVolumePR } = checkSetPR(exIdx, setIdx, updated);
      if (isWeightPR || isRepsPR || isVolumePR) {
        const def = allExercises.find(e => e.id === updated[exIdx].exerciseId);
        const exName = def ? getExerciseName(def, language) : "";
        const isCardio = def?.category.includes('Cardio');

        const types: string[] = [];
        if (isWeightPR) types.push(isCardio ? (language === 'es' ? "VELOCIDAD" : "SPEED") : (language === 'es' ? "PESO MÁX" : "MAX WEIGHT"));
        if (isRepsPR) types.push(isCardio ? (language === 'es' ? "DISTANCIA" : "DISTANCE") : (language === 'es' ? "REPS" : "REPS"));
        if (isVolumePR) types.push(isCardio ? (language === 'es' ? "VOL. TOTAL" : "TOTAL VOL") : (language === 'es' ? "PESO TOTAL" : "TOTAL WEIGHT"));

        const cardioSpeed = isCardio && updated[exIdx].loggedSets[setIdx].weightKg > 0
          ? (updated[exIdx].loggedSets[setIdx].reps / (updated[exIdx].loggedSets[setIdx].weightKg / 3600)).toFixed(1)
          : null;

        setLatestPR({
          exercise: exName,
          type: language === 'es'
            ? `¡NUEVO RÉCORD ${types.join(" + ")}! ${cardioSpeed ? `(${cardioSpeed} ${speedUnit})` : ''}`
            : `NEW ${types.join(" + ")} PR! ${cardioSpeed ? `(${cardioSpeed} ${speedUnit})` : ''}`
        });
        setTimeout(() => setLatestPR(null), 4000);
      }
    }
  }, [exercises, checkSetPR, allExercises, language, thresholds, updateExercisesByExerciseId, customExercises, speedUnit, day.exercises]);

  const getWarmupValidation = (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    const s = ex.loggedSets[setIdx];
    if (!s.isWarmup) return null;

    const routineEx = day.exercises.find(e => e.exerciseId === ex.exerciseId);

    const lastSessionWithEx = [...workoutHistory].reverse().find(sess =>
      sess.exercises.some(e => e.exerciseId === ex.exerciseId)
    );

    let targetWeight = routineEx?.weightKg || 0;

    if (lastSessionWithEx) {
      const lastEx = lastSessionWithEx.exercises.find(e => e.exerciseId === ex.exerciseId);
      const completedSets = lastEx?.loggedSets.filter(ls => ls.completed) || [];
      if (completedSets.length > 0) {
        targetWeight = Math.max(...completedSets.map(ls => ls.weightKg));
      }
    }

    if (targetWeight <= 0) return null;

    const warmupIdx = ex.loggedSets.slice(0, setIdx + 1).filter(set => set.isWarmup).length - 1;

    const expectedReps = Math.max(1, 8 - (warmupIdx * 2));
    const expectedWeight = targetWeight * (0.4 + (warmupIdx * 0.2));

    const weightTol = targetWeight * 0.15;
    const isTooHigh = s.weightKg > expectedWeight + weightTol || s.reps > expectedReps + 1;
    const isTooLow = s.weightKg < expectedWeight - weightTol || s.reps < expectedReps - 1;

    if (isTooHigh || isTooLow) {
      const prefix = isTooHigh
        ? (language === 'es' ? "⚠️ Carga superior a la recomendada" : "⚠️ Load higher than recommended")
        : (language === 'es' ? "⚠️ Carga inferior a la recomendada" : "⚠️ Load lower than recommended");

      return `${prefix}. ${language === 'es' ? 'Sugerido' : 'Suggested'}: ${expectedReps} reps @ ${formatWeight(expectedWeight, weightUnit)}`;
    }
    return null;
  };

  const handleManualInput = (exIdx: number, setIdx: number, field: 'reps' | 'weightKg', val: string, wUnit: 'kg' | 'lbs', dUnit: 'km' | 'mi') => {
    const key = `${exIdx}-${setIdx}-${field}`;
    const def = allExercises.find(e => e.id === exercises[exIdx].exerciseId);
    const isCardio = def?.category.includes('Cardio');

    if (isCardio && field === 'weightKg' && val.includes(':')) {
      const parts = val.split(':');
      const h = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      const totalSecs = (h * 3600) + (m * 60);
      setInputStrings(prev => ({ ...prev, [key]: val }));
      updateSet(exIdx, setIdx, field, totalSecs);
      return;
    }

    const allowsDecimals = field === 'weightKg' || field === 'reps';
    const sanitized = allowsDecimals ? val.replace(/[^0-9.,]/g, '') : val.replace(/[^0-9]/g, '');

    let normalized = sanitized.replace(/,/g, '.');
    const parts = normalized.split('.');
    if (parts.length > 2) {
      normalized = parts[0] + '.' + parts.slice(1).join('');
    }

    setInputStrings(prev => ({ ...prev, [key]: sanitized }));

    if (normalized !== '' && normalized !== '.') {
      let num = parseFloat(normalized);
      if (!isNaN(num)) {
        if (field === 'weightKg') {
          num = convertWeightInputToKg(num, wUnit);
        } else if (field === 'reps' && isCardio) {
          num = convertDistanceInputToKm(num, dUnit);
        }
        updateSet(exIdx, setIdx, field, num);
      }
    } else if (normalized === '') {
      updateSet(exIdx, setIdx, field, 0);
    }
  };

  const totalSets = exercises.reduce((acc, ex) => acc + ex.plannedSets, 0);
  const completedSets = exercises.reduce((acc, ex) => acc + ex.loggedSets.filter(s => s.completed).length, 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const liveScore = useMemo(() =>
    calcEfficiencyScore(exercises, workoutHistory, day.id),
    [exercises, workoutHistory, day.id]);

  return (
    <div className="flex flex-col min-h-screen">
      {latestPR && (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 border border-amber-600">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider leading-none mb-0.5">{latestPR.type}</span>
                <span className="text-sm font-bold leading-tight">{latestPR.exercise}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setLatestPR(null)} className="h-8 w-8 text-white hover:bg-white/20"><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <div className="sticky top-16 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          {hasCardio && (
            <div className="mb-3 p-2.5 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-700/50">
                <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Activity className="w-3 h-3" /> {language === 'es' ? `Umbrales (${speedUnit}):` : `Speed Thresholds (${speedUnit}):`}</span>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-zinc-400 font-medium">Moderado &gt;</Label>
                  <input
                    type="number"
                    step="0.5"
                    value={thresholds.moderate}
                    onChange={e => setThresholds(prev => ({ ...prev, moderate: parseFloat(e.target.value) || 0 }))}
                    className="w-10 h-6 text-center text-[10px] bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-zinc-400 font-medium">Avanzado &gt;</Label>
                  <input
                    type="number"
                    step="0.5"
                    value={thresholds.intense}
                    onChange={e => setThresholds(prev => ({ ...prev, intense: parseFloat(e.target.value) || 0 }))}
                    className="w-10 h-6 text-center text-[10px] bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex flex-col">
                  <span className="text-[8px] text-zinc-400 uppercase font-black tracking-tighter leading-none mb-1">{language === 'es' ? 'Suave' : 'Soft'}</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">0 - {thresholds.moderate} <span className="text-[8px] font-normal opacity-70">{speedUnit}</span></span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-[8px] text-zinc-400 uppercase font-black tracking-tighter leading-none mb-1">{language === 'es' ? 'Moderado' : 'Moderate'}</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{thresholds.moderate} - {thresholds.intense} <span className="text-[8px] font-normal opacity-70">{speedUnit}</span></span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[8px] text-zinc-400 uppercase font-black tracking-tighter leading-none mb-1">{language === 'es' ? 'Avanzado' : 'Advanced'}</span>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">&ge; {thresholds.intense} <span className="text-[8px] font-normal opacity-70">{speedUnit}</span></span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-zinc-50">{day.name}</h2>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(elapsed)}</span>
                <span>{completedSets}/{totalSets} {hasCardio ? (language === 'es' ? 'intervalos completados' : 'intervals done') : t.tracker_sets_done}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isResting && (() => {
                const isOvertime = restTargetSecs > 0 && restTime >= restTargetSecs;
                return (
                  <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-white animate-pulse transition-colors ${isOvertime ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-emerald-500'}`}>
                    <span className="text-[10px] uppercase tracking-wider leading-none mb-1">
                      {isOvertime
                        ? (language === 'es' ? '¡Tiempo!' : "Time's up!")
                        : (language === 'es' ? 'Descanso' : 'Rest')}
                    </span>
                    <span className="text-lg font-bold font-mono leading-none">{formatTime(restTime)}</span>
                    {isOvertime && restTargetSecs > 0 && (
                      <span className="text-[9px] opacity-80 font-mono leading-none mt-0.5">+{formatTime(restTime - restTargetSecs)}</span>
                    )}
                  </div>
                );
              })()}
              <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{t.tracker_efficiency}</span>
                <span className={`text-lg font-bold ${liveScore >= 80 ? 'text-emerald-500' : liveScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{liveScore}</span>
              </div>
              <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <DialogTrigger render={
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </Button>
                } />
                <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <DialogHeader>
                    <DialogTitle>{language === 'es' ? '¿Finalizar Sesión?' : 'Finish Session?'}</DialogTitle>
                    <DialogDescription>
                      {language === 'es' ? '¿Querés guardar tu progreso para seguir después o descartar esta sesión?' : 'Do you want to save your progress to continue later or discard this session?'}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="outline" onClick={onCancel} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/50">
                      {language === 'es' ? 'Descartar y Salir' : 'Discard and Exit'}
                    </Button>
                    <Button onClick={onPause} className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-bold">
                      {language === 'es' ? 'Guardar y Salir' : 'Save and Exit'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-100 dark:bg-zinc-800" indicatorClass={progress === 100 ? "bg-emerald-500" : "bg-emerald-500"} />
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-6 max-w-3xl flex-1 space-y-4">
        {exercises.map((ex, exIdx) => {
          const def = allExercises.find(e => e.id === ex.exerciseId);
          const allDone = ex.loggedSets.every(s => s.completed);
          const isCardio = def?.category.includes('Cardio');
          return (
            <Card key={ex.exerciseId + exIdx} className={`bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 transition-all ${allDone ? 'border-emerald-500/50 dark:border-emerald-500/30' : ''}`}>
              <CardHeader className="pb-2 pt-4 px-2 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                      {def ? getExerciseName(def, language) : t.build_unknown_ex}
                      <button
                        onClick={() => setExpandedProgressEx(expandedProgressEx === ex.exerciseId ? null : ex.exerciseId)}
                        className={`p-1.5 rounded-md transition-colors ${expandedProgressEx === ex.exerciseId ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}
                        title={language === 'es' ? 'Ver progreso' : 'View progress'}
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      {(() => {
                        const routineEx = day.exercises.find(e => e.exerciseId === ex.exerciseId);
                        return routineEx ? (
                          <div className="flex items-center ml-2 bg-zinc-100 dark:bg-zinc-800 rounded px-1" onClick={(e) => e.stopPropagation()}>
                            <Clock className="w-3 h-3 text-zinc-400 mr-1" />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestSecsChange(routineEx.id, -15); }}
                              className="px-1 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded font-bold"
                            >-</button>
                            <span className="text-[10px] text-zinc-400 font-mono w-6 text-center">
                              {routineEx.restSecs}s
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestSecsChange(routineEx.id, 15); }}
                              className="px-1 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded font-bold"
                            >+</button>
                          </div>
                        ) : null;
                      })()}
                    </CardTitle>
                    <p className="text-sm text-zinc-500 mt-0.5">{def ? getMuscleLabel(def.primaryMuscle, language) : ''} · {def?.grip ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Reorder controls */}
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={exIdx === 0}
                        onClick={() => reorderExercise(exIdx, exIdx - 1)}
                        className="h-8 w-8 text-zinc-400 disabled:opacity-30 disabled:pointer-events-none hover:text-zinc-600 dark:hover:text-zinc-300"
                        title={language === 'es' ? 'Subir ejercicio' : 'Move exercise up'}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={exIdx === exercises.length - 1}
                        onClick={() => reorderExercise(exIdx, exIdx + 1)}
                        className="h-8 w-8 text-zinc-400 disabled:opacity-30 disabled:pointer-events-none hover:text-zinc-600 dark:hover:text-zinc-300"
                        title={language === 'es' ? 'Bajar ejercicio' : 'Move exercise down'}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>

                    {def?.id.startsWith('custom_') && (
                      <Dialog>
                        <DialogTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-500">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        } />
                        <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                          <DialogHeader>
                            <DialogTitle>{language === 'es' ? 'Editar Ejercicio' : 'Edit Exercise'}</DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <Label>{language === 'es' ? 'Nombre del Ejercicio' : 'Exercise Name'}</Label>
                            <Input
                              defaultValue={getExerciseName(def, language)}
                              onChange={(e) => updateExercisesByExerciseId(def.id, { customName: e.target.value })}
                              className="mt-2"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExerciseFromSession(exIdx)}
                      className="h-8 w-8 text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {allDone && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  </div>
                </div>
              </CardHeader>

              {expandedProgressEx === ex.exerciseId && (
                <div className="px-2 sm:px-6 pb-4 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <InlineExerciseProgress exId={ex.exerciseId} history={workoutHistory} language={language} />
                </div>
              )}

              <CardContent className="px-2 sm:px-6 pb-4">
                <div className="grid grid-cols-[1.25rem_1.5rem_1fr_1fr_2rem_2rem] sm:grid-cols-[2rem_2.5rem_1fr_1fr_2.5rem_2.5rem] gap-1 sm:gap-2 mb-2 text-[10px] text-zinc-400 uppercase font-bold tracking-wider px-1">
                  <span>#</span>
                  <span className="text-center">{language === 'es' ? 'APROX' : 'WARM'}</span>
                  <span className="text-center">{isCardio ? distanceUnit.toUpperCase() : t.build_reps}</span>
                  <span className="text-center">{isCardio ? (language === 'es' ? 'Tiempo' : 'Time') : t.tracker_weight}</span>
                  <span></span>
                  <span></span>
                </div>
                <div className="space-y-2">
                  {ex.loggedSets.map((s, si) => {
                    const warmupWarning = getWarmupValidation(exIdx, si);
                    return (
                      <div key={si} className={`grid grid-cols-[1.25rem_1.5rem_1fr_1fr_2rem_2rem] sm:grid-cols-[2rem_2.5rem_1fr_1fr_2.5rem_2.5rem] gap-1 sm:gap-2 items-center rounded-lg px-1 py-1 transition-colors relative ${s.completed ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-zinc-50 dark:bg-zinc-800/50'} ${s.isWarmup ? 'border-l-2 border-amber-500/50' : ''}`}>
                        <span className="text-sm font-medium text-zinc-500">{si + 1}</span>

                        <div className="flex flex-col items-center justify-center relative">
                          <button
                            onClick={() => updateSet(exIdx, si, 'isWarmup', !s.isWarmup)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all ${s.isWarmup ? 'bg-amber-500 text-white shadow-sm' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            title={language === 'es' ? 'Marcar como serie de aproximación' : 'Mark as warmup set'}
                          >
                            <Flame className={`w-3.5 h-3.5 ${s.isWarmup ? 'animate-pulse' : ''}`} />
                          </button>
                          {warmupWarning && (
                            <div className="absolute -top-2 -right-1" title={warmupWarning}>
                              <AlertTriangle className="w-3 h-3 text-amber-500 fill-amber-500/10" />
                            </div>
                          )}
                        </div>

                        {/* Reps spinner */}
                        <div className="flex items-center gap-0.5 sm:gap-1 justify-center">
                          <button onClick={() => updateSet(exIdx, si, 'reps', Math.max(0, s.reps - 0.5))} className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={inputStrings[`${exIdx}-${si}-reps`] ?? (s.reps === 0 ? '' : (isCardio ? getDistanceInUnit(s.reps, distanceUnit).toString() : (Number.isInteger(s.reps) ? s.reps.toString() : s.reps.toFixed(1))))}
                            onChange={(e) => handleManualInput(exIdx, si, 'reps', e.target.value, weightUnit, distanceUnit)}
                            className="w-8 sm:w-12 h-8 text-center text-sm font-bold bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 border-0"
                          />
                          <button onClick={() => updateSet(exIdx, si, 'reps', s.reps + (isCardio ? convertDistanceInputToKm(0.5, distanceUnit) : 0.5))} className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {/* Weight spinner */}
                        <div className="flex items-center gap-0.5 sm:gap-1 justify-center">
                          <button onClick={() => updateSet(exIdx, si, 'weightKg', Math.max(0, s.weightKg - (isCardio ? 5 : convertWeightInputToKg(2.5, weightUnit))))} className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={isCardio ? "HH:MM" : (weightUnit === 'lbs' ? 'Lbs' : 'Kg')}
                            value={isCardio ? `${Math.floor(s.weightKg / 3600)}:${Math.floor((s.weightKg % 3600) / 60).toString().padStart(2, '0')}` : (inputStrings[`${exIdx}-${si}-weightKg`] ?? (s.weightKg === 0 ? '' : getWeightInUnit(s.weightKg, weightUnit).toFixed(1).replace(/\.0$/, '')))}
                            onChange={(e) => handleManualInput(exIdx, si, 'weightKg', e.target.value, weightUnit, distanceUnit)}
                            className="w-10 sm:w-16 h-8 text-center text-sm font-bold bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 border-0"
                          />
                          <button onClick={() => updateSet(exIdx, si, 'weightKg', s.weightKg + (isCardio ? 5 : convertWeightInputToKg(2.5, weightUnit)))} className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {/* Complete toggle */}
                        <button
                          onClick={() => updateSet(exIdx, si, 'completed', !s.completed)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors ${s.completed ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600'}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        {/* Delete set */}
                        <button
                          disabled={ex.loggedSets.length <= 1}
                          onClick={() => removeSetFromExercise(exIdx, si)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors ${ex.loggedSets.length > 1 ? 'text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-30'}`}
                          title={ex.loggedSets.length <= 1 ? (language === 'es' ? 'Debe haber al menos una serie' : 'Must keep at least one set') : (language === 'es' ? 'Eliminar serie' : 'Delete set')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Error text for mobile/compact view */}
                        {warmupWarning && (
                          <div className="col-span-6 px-2 pb-1">
                            <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium italic animate-in fade-in slide-in-from-left-1">
                              {warmupWarning}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addSetToExercise(exIdx)}
                  className="w-full mt-2 border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-emerald-500 text-[10px] font-bold uppercase py-1 h-7"
                >
                  <Plus className="w-3 h-3 mr-1" /> {language === 'es' ? 'Añadir Serie' : 'Add Set'}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {/* Add exercise during workout */}
        <div className="pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
          <select
            className="w-full h-12 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 text-center"
            onChange={(e) => { addExerciseMidWorkout(e.target.value); e.target.value = ""; }}
            defaultValue=""
          >
            <option value="" disabled>+ {language === 'es' ? 'Añadir Ejercicio' : 'Add Exercise'}</option>
            {allExercises.map(ex => (
              <option key={ex.id} value={ex.id}>{getExerciseName(ex, language)}</option>
            ))}
          </select>

          {/* Create custom exercise button */}
          <Button
            variant="outline"
            onClick={() => setShowCreateExDialog(true)}
            className="w-full h-10 text-xs font-bold border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Crear Ejercicio Personalizado' : 'Create Custom Exercise'}
          </Button>

          {/* Create custom exercise dialog */}
          <Dialog open={showCreateExDialog} onOpenChange={setShowCreateExDialog}>
            <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-500" />
                  {language === 'es' ? 'Nuevo Ejercicio' : 'New Exercise'}
                </DialogTitle>
                <DialogDescription>
                  {language === 'es' ? 'Crea un ejercicio personalizado y agrégalo a tu sesión.' : 'Create a custom exercise and add it to your session.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-zinc-500 uppercase">{language === 'es' ? 'Nombre' : 'Name'}</Label>
                  <Input
                    value={newExName}
                    onChange={e => setNewExName(e.target.value)}
                    placeholder={language === 'es' ? 'Ej: Press Inclinado Máquina' : 'E.g: Incline Machine Press'}
                    className="bg-white dark:bg-zinc-900"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-zinc-500 uppercase">{language === 'es' ? 'Músculo Principal' : 'Primary Muscle'}</Label>
                  <select
                    value={newExMuscle}
                    onChange={e => setNewExMuscle(e.target.value as MuscleGroup)}
                    className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                  >
                    {MUSCLE_OPTIONS.map(m => (
                      <option key={m} value={m}>{getMuscleLabel(m, language)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-zinc-500 uppercase">{language === 'es' ? 'Categoría' : 'Category'}</Label>
                    <select
                      value={newExCategory}
                      onChange={e => setNewExCategory(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                    >
                      {CATEGORY_OPTIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-zinc-500 uppercase">Grip</Label>
                    <select
                      value={newExGrip}
                      onChange={e => setNewExGrip(e.target.value as GripType)}
                      className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                    >
                      {GRIP_OPTIONS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateExDialog(false)}
                  className="flex-1"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button
                  disabled={!newExName.trim()}
                  onClick={() => {
                    const id = `custom_${Date.now()}`;
                    addCustomExercise({
                      id,
                      name: newExName.trim(),
                      primaryMuscle: newExMuscle,
                      secondaryMuscles: [],
                      category: newExCategory as ExerciseDef['category'],
                      grip: newExGrip,
                      estimatedDurationPerSetSecs: 45
                    });
                    // Add to current session immediately
                    const newEx: LoggedExercise = {
                      exerciseId: id,
                      plannedSets: 3,
                      plannedReps: 10,
                      loggedSets: Array.from({ length: 3 }, () => ({
                        reps: 10,
                        weightKg: 0,
                        completed: false,
                        isWarmup: false
                      }))
                    };
                    setExercises(prev => [...prev, newEx]);
                    // Reset form
                    setNewExName('');
                    setNewExMuscle('Chest');
                    setNewExCategory('Dumbbell');
                    setNewExGrip('Any');
                    setShowCreateExDialog(false);
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-bold"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Crear y Agregar' : 'Create & Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Finish button */}
        <Button
          onClick={() => onFinish(exercises, elapsed)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-semibold py-6 text-base mt-4"
        >
          <Trophy className="w-5 h-5 mr-2" /> {t.tracker_finish}
        </Button>
      </div>
    </div>
  );
}

function WorkoutSummary({ session, onDone }: { session: WorkoutSession; onDone: () => void }) {
  const language = useStore(s => s.language) as "en" | "es";
  const customExercises = useStore(s => s.customExercises);
  const { weightUnit, distanceUnit } = useStore();
  const speedUnit = distanceUnit === 'mi' ? 'mi/h' : 'km/h';
  const t = translations[language];
  const allExercises = useMemo(() => [...EXERCISE_DATABASE, ...customExercises], [customExercises]);

  const totalVolume = session.exercises.reduce((acc, ex) => {
    const def = allExercises.find(e => e.id === ex.exerciseId);
    if (def?.category.includes('Cardio')) return acc;
    return acc + ex.loggedSets.filter(s => s.completed).reduce((s, ls) => s + ls.reps * ls.weightKg, 0)
  }, 0
  );
  const completedSets = session.exercises.reduce((acc, ex) => acc + ex.loggedSets.filter(s => s.completed).length, 0);
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.plannedSets, 0);

  const totalStrengthReps = session.exercises.reduce((acc, ex) => {
    const def = allExercises.find(e => e.id === ex.exerciseId);
    if (def?.category.includes('Cardio')) return acc;
    return acc + ex.loggedSets.filter(s => s.completed).reduce((s, ls) => s + ls.reps, 0)
  }, 0);

  const kgPerRep = totalStrengthReps > 0 ? (totalVolume / totalStrengthReps) : 0;

  const workoutHistory = useStore(s => s.workoutHistory);
  const prData = useMemo(() => checkPRs(session, workoutHistory, allExercises), [session, workoutHistory, allExercises]);

  const prCounts = useMemo(() => {
    const counts: Record<PRType, number> = { weight: 0, reps: 0, volume: 0, km: 0, speed: 0 };
    Object.values(prData).forEach(types => {
      types.forEach(type => {
        counts[type]++;
      });
    });
    return counts;
  }, [prData]);

  const totalPRs = Object.values(prCounts).reduce((a, b) => a + b, 0);

  // Get previous session of same day for trend analysis
  const prevSession = useMemo(() => {
    const sameDay = workoutHistory
      .filter(s => s.dayId === session.dayId && s.id !== session.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sameDay.length > 0 ? sameDay[0] : null;
  }, [workoutHistory, session]);

  const sessionTrend = prevSession ? getTrend(totalVolume, getSessionVolume(prevSession, allExercises)) : 'neutral';
  const sessionAlerts = getVolumeAlerts(session, workoutHistory, allExercises, language);

  const score = session.efficiencyScore;
  const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';
  const scoreBg = score >= 80 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : score >= 50 ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {totalPRs > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 shrink-0" />
            <p className="font-bold text-sm">
              {language === 'es'
                ? `¡Increíble! Batiste ${totalPRs} récords personales en total.`
                : `Amazing! You achieved ${totalPRs} total personal records.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 ml-9">
            {prCounts.weight > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold py-0.5">
                {prCounts.weight} {language === 'es' ? 'P. Máx' : 'P. Max'}
              </Badge>
            )}
            {prCounts.reps > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold py-0.5">
                {prCounts.reps} {language === 'es' ? 'Reps' : 'Reps'}
              </Badge>
            )}
            {prCounts.volume > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold py-0.5">
                {prCounts.volume} {language === 'es' ? 'Vol. Total' : 'Total Vol.'}
              </Badge>
            )}
            {prCounts.km > 0 && (
              <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-bold py-0.5">
                {prCounts.km} {distanceUnit.toUpperCase()}
              </Badge>
            )}
            {prCounts.speed > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] uppercase font-bold py-0.5">
                {prCounts.speed} {speedUnit.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      )}

      {sessionAlerts.map((alert, i) => (
        <div key={i} className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed font-medium">
            {alert}
          </p>
        </div>
      ))}

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500 mb-4">
          <Trophy className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{t.tracker_summary_title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">{session.dayName}</p>
      </div>

      {/* Efficiency Score */}
      <div className={`border rounded-2xl p-6 mb-6 text-center ${scoreBg}`}>
        <div className="text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">{t.tracker_efficiency_score}</div>
        <div className={`text-7xl font-black ${scoreColor}`}>{score}</div>
        <div className="text-zinc-500 text-sm mt-1">/ 100</div>
        <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
          {score >= 80 ? t.tracker_score_great : score >= 50 ? t.tracker_score_ok : t.tracker_score_low}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: t.tracker_summary_duration, value: formatTime(session.durationSecs), icon: <Clock className="w-4 h-4 text-blue-500" /> },
          { label: t.tracker_sets_done, value: `${completedSets}/${totalSets}`, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
          { label: t.tracker_volume, value: <div className="flex items-center gap-1 justify-center">{formatWeight(totalVolume, weightUnit)} <TrendArrow trend={sessionTrend} /></div>, icon: <Flame className="w-4 h-4 text-orange-500" /> },
          { label: language === 'es' ? `${weightUnit}/Rep` : `${weightUnit}/Rep`, value: `${formatWeight(kgPerRep, weightUnit, false, 2)} ${weightUnit}`, icon: <Dumbbell className="w-4 h-4 text-purple-500" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">{stat.icon}</div>
            <div className="font-bold text-zinc-900 dark:text-zinc-50 text-lg">{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Per-exercise breakdown */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 mb-6">
        <CardContent className="p-4 space-y-3">
          {session.exercises.map((ex, i) => {
            const def = allExercises.find(e => e.id === ex.exerciseId);
            const vol = ex.loggedSets.filter(s => s.completed).reduce((s, ls) => s + ls.reps * ls.weightKg, 0);
            const done = ex.loggedSets.filter(s => s.completed).length;
            const prTypes = prData[ex.exerciseId];
            const isCardio = def?.category.includes('Cardio');
            const prevEx = prevSession?.exercises.find(e => e.exerciseId === ex.exerciseId);
            const exTrend = prevEx ? getTrend(vol, getExVolume(prevEx)) : 'neutral';

            if (isCardio) {
              const completedSets = ex.loggedSets.filter(s => s.completed);
              const speeds = completedSets.map(s => s.weightKg > 0 ? (s.reps / (s.weightKg / 3600)) : 0);
              const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

              const getCardioType = (spd: number) => {
                if (spd >= 10) return language === 'es' ? 'Avanzado' : 'Intense';
                if (spd >= 6) return language === 'es' ? 'Moderado' : 'Moderate';
                return language === 'es' ? 'Suave' : 'Soft';
              };

              const resultType = getCardioType(avgSpeed);

              const variance = completedSets.length > 1
                ? speeds.reduce((acc, s) => acc + Math.pow(s - avgSpeed, 2), 0) / speeds.length
                : 0;
              const speedDev = Math.sqrt(variance);
              const speedDevConverted = getDistanceInUnit(speedDev, distanceUnit);

              return (
                <div key={i} className="py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {def ? getExerciseName(def, language) : t.build_unknown_ex}
                        {prTypes && (
                          <div className="flex gap-1">
                            {prTypes.map(type => (
                              <Badge key={type} className="bg-amber-500 text-[8px] px-1 py-0 h-3.5 uppercase">
                                {type === 'km' ? distanceUnit.toUpperCase() : type === 'speed' ? speedUnit.toUpperCase() : 'Vol'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{language === 'es' ? 'Resultado' : 'Result'}: <span className="text-blue-500">{resultType}</span></span>
                        {completedSets.length > 1 && <span className="text-[9px] text-zinc-400 italic">{language === 'es' ? 'Consistencia' : 'Consistency'}: ±{speedDevConverted.toFixed(2)} {speedUnit}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-zinc-900 dark:text-zinc-50">{avgSpeed.toFixed(1)} <span className="text-[10px] font-normal text-zinc-500">{speedUnit} avg.</span></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {completedSets.map((s, si) => {
                      const speed = s.weightKg > 0 ? (s.reps / (s.weightKg / 3600)) : 0;
                      const type = getCardioType(speed);
                      const color = speed >= 10 ? 'text-amber-600 dark:text-amber-400' : speed >= 6 ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400';
                      return (
                        <div key={si} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40 rounded-lg px-3 py-2 border border-zinc-100 dark:border-zinc-800/50">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none mb-1">{language === 'es' ? 'Intervalo' : 'Interval'} {si + 1}</span>
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">{formatDistance(s.reps, distanceUnit, false)}{distanceUnit} <span className="opacity-50">@</span> {Math.floor(s.weightKg / 3600)}:{Math.floor((s.weightKg % 3600) / 60).toString().padStart(2, '0')}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{speed.toFixed(1)} {speedUnit}</div>
                            <div className={`text-[9px] font-black uppercase tracking-tighter ${color}`}>{type}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {def ? getExerciseName(def, language) : t.build_unknown_ex}
                    {prTypes && (
                      <div className="flex gap-1">
                        {prTypes.map(type => (
                          <Badge key={type} className="bg-amber-500 text-[8px] px-1 py-0 h-3.5 uppercase">
                            {type === 'weight' ? weightUnit.toUpperCase() : type === 'reps' ? 'Reps' : type === 'km' ? distanceUnit.toUpperCase() : type === 'speed' ? speedUnit.toUpperCase() : 'Vol'}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">{done}/{ex.plannedSets} {language === 'es' ? 'series' : 'sets'}</div>
                  {!isCardio && vol > 0 && totalStrengthReps > 0 && (
                    <div className="text-xs text-zinc-500">
                      {`${weightUnit}/Rep`}: {(vol / ex.loggedSets.filter(s => s.completed).reduce((a, b) => a + b.reps, 0)).toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={done === ex.plannedSets ? "default" : "outline"} className={done === ex.plannedSets ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "text-zinc-400"}>
                    {isCardio
                      ? ex.loggedSets.filter(s => s.completed).map(s => `${formatDistance(s.reps, distanceUnit, false)}${distanceUnit} (${Math.floor(s.weightKg / 3600)}:${Math.floor((s.weightKg % 3600) / 60).toString().padStart(2, '0')})`).join(', ')
                      : (vol > 0
                        ? formatWeight(vol, weightUnit)
                        : '—')
                    }
                  </Badge>
                  {!isCardio && vol > 0 && <TrendArrow trend={exTrend} />}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={onDone} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-semibold py-5">
        {t.tracker_done}
      </Button>
    </div>
  );
}

export default function TrackerPage() {
  const saveWorkoutSession = useStore(s => s.saveWorkoutSession);
  const activeSession = useStore(s => s.activeSession);
  const setActiveSession = useStore(s => s.setActiveSession);
  const days = useStore(s => s.days); // Fetch days from store
  const workoutHistory = useStore(s => s.workoutHistory);
  const language = useStore(s => s.language) as "en" | "es";
  const profile = useStore(s => s.profile);
  const customExercises = useStore(s => s.customExercises);


  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  const [phase, setPhase] = useState<'metrics' | 'select' | 'active' | 'summary' | 'history' | 'progress'>('select');

  useEffect(() => {
    if (isHydrated) {
      const isMissingMetrics = !profile?.heightCm || !profile?.weightKg || !profile?.age || !profile?.gender;
      const isReviewDue = profile?.lastReviewAt && (Date.now() - new Date(profile.lastReviewAt).getTime() > 60 * 86400000);

      if (isMissingMetrics || isReviewDue) {
        setTimeout(() => setPhase('metrics'), 0);
      }
    }
  }, [isHydrated, profile]);

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const selectedDay = useMemo(() => days.find(d => d.id === selectedDayId) || null, [days, selectedDayId]);

  const [completedSession, setCompletedSession] = useState<WorkoutSession | null>(null);

  const handleStartWorkout = (day: WorkoutDay) => {
    setSelectedDayId(day.id);
    setPhase('active');
  };

  const handleMetricsDone = () => {
    setPhase('select');
  };

  const handlePause = () => {
    setPhase('select');
    setSelectedDayId(null);
  };

  const handleFinish = (exercises: LoggedExercise[], durationSecs: number) => {
    if (!selectedDay) return;
    const score = calcEfficiencyScore(exercises, workoutHistory, selectedDay.id);
    setActiveSession(null); // Clear active session on finish
    const session: WorkoutSession = {
      id: Date.now().toString(),
      dayId: selectedDay.id,
      dayName: selectedDay.name,
      date: new Date().toISOString(),
      durationSecs,
      exercises,
      efficiencyScore: score
    };
    saveWorkoutSession(session);
    setCompletedSession(session);
    setPhase('summary');
  };

  const handleCancel = () => {
    setActiveSession(null);
    setPhase('select');
    setSelectedDayId(null);
  };

  const handleDone = () => {
    setPhase('select');
    setSelectedDayId(null);
    setCompletedSession(null);
  };

  if (!isHydrated) return null;

  // Resume active session prompt
  if (phase === 'select' && activeSession) {
    const day = (days || []).find((d: WorkoutDay) => d.id === activeSession.dayId);
    if (day) {
      return (
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-8 rounded-3xl border border-emerald-200">
            <Activity className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{language === 'es' ? 'Entrenamiento en pausa' : 'Workout in progress'}</h2>
            <p className="text-sm text-zinc-500 mb-6">{language === 'es' ? `Tienes una sesión de "${activeSession.dayName}" sin terminar.` : `You have an unfinished session of "${activeSession.dayName}".`}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleStartWorkout(day)} className="bg-emerald-500 text-white">Continuar sesión</Button>
              <Button variant="ghost" onClick={() => setActiveSession(null)} className="text-red-500">Descartar y empezar de cero</Button>
            </div>
          </div>
        </div>
      );
    }
  }

  if (phase === 'metrics') {
    return <BodyMetricsScreen onDone={handleMetricsDone} />;
  }

  if (phase === 'active' && selectedDay) {
    return <ActiveWorkout day={selectedDay} onFinish={handleFinish} onCancel={handleCancel} onPause={handlePause} />;
  }

  if (phase === 'summary' && completedSession) {
    return <WorkoutSummary session={completedSession} onDone={handleDone} />;
  }

  if (phase === 'history') {
    return <HistoryCalendar history={workoutHistory} language={language} customExercises={customExercises} onBack={() => setPhase('select')} />;
  }

  if (phase === 'progress') {
    return <ExerciseProgressView history={workoutHistory} language={language} customExercises={customExercises} onBack={() => setPhase('select')} />;
  }

  return <DaySelectionScreen onSelect={handleStartWorkout} onViewHistory={() => setPhase('history')} onViewProgress={() => setPhase('progress')} />;
}
