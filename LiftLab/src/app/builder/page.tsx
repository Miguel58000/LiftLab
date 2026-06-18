"use client";

import { useStore, WorkoutDay, RoutineExercise } from "@/store/useStore";
import { EXERCISE_DATABASE, MuscleGroup, ExerciseDef, getExerciseName, GripType } from "@/lib/exercises";
import { translations } from "@/lib/i18n";
import { getMuscleLabel } from "@/app/dashboard/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Dumbbell, Clock, Repeat, Hash, Pencil } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { generateSuggestedRoutine, getPersonalizedSuggestions, SuggestedDay } from "@/lib/suggestions";
import { analyzeRoutine } from "@/lib/analyzer";
import { ChevronRight, Activity, Sparkles, ChevronUp, ChevronDown, Search } from "lucide-react";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Adductors', 'Chest', 'Upper Chest', 'Lats', 'Upper Back', 'Lower Back',
  'Traps', 'Front Delts', 'Lateral Delts', 'Rear Delts', 'Serratus',
  'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes',
  'Calves', 'Abs', 'Obliques',
  'Tibialis',
  'Brachialis',
  'Neck',
  'Cardio',
  'Psoas'
];

export default function BuilderPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const days = useStore((state) => state.days || []);
  const addDay = useStore((state) => state.addDay);
  const updateDayName = useStore((state) => state.updateDayName);
  const removeDay = useStore((state) => state.removeDay);
  const addExerciseToDay = useStore((state) => state.addExerciseToDay);
  const updateExerciseInDay = useStore((state) => state.updateExerciseInDay);
  const updateExerciseGlobal = useStore((state) => state.updateExerciseGlobal);
  const updateCustomExerciseDef = useStore((state) => state.updateCustomExerciseDef);
  const updateExercisesByExerciseId = useStore((state) => state.updateExercisesByExerciseId);
  const reorderExerciseInDay = useStore((state) => state.reorderExerciseInDay);
  const removeExerciseGlobal = useStore((state) => state.removeExerciseGlobal);
  const language = useStore((state) => state.language) as "en" | "es";
  const customExercises = useStore((state) => state.customExercises || []);
  const addCustomExercise = useStore((state) => state.addCustomExercise);
  const loadSuggestedDays = useStore((state) => state.loadSuggestedDays);
  const profile = useStore((state) => state.profile);
  const setProfile = useStore((state) => state.setProfile);

  const t = translations[language];

  const CATEGORY_TRANSLATIONS: Record<"en" | "es", Record<string, string>> = {
    en: {
      Barbell: "Barbell", Dumbbell: "Dumbbell", Machine: "Machine",
      Cable: "Cable", Bodyweight: "Bodyweight", "Smith Machine": "Smith Machine",
      "Soft Cardio": "Soft Cardio", "Moderate Cardio": "Moderate Cardio", "Intense Cardio": "Advanced Cardio",
      Plyometrics: "Plyometrics",
      Cardio: "Cardio",
    },
    es: {
      Barbell: "Barra Libre", Dumbbell: "Mancuernas", Machine: "Máquina",
      Cable: "Polea", Bodyweight: "Peso Corporal", "Smith Machine": "Smith Machine",
      "Soft Cardio": "Cardio Suave", "Moderate Cardio": "Cardio Moderado", "Intense Cardio": "Cardio Avanzado",
      Plyometrics: "Pliométricos",
      Cardio: "Cardio",
    },
  };

  function getCategoryLabel(category: string, lang: "en" | "es"): string {
    return CATEGORY_TRANSLATIONS[lang][category];
  }

  // Smart Optimizer States
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantStep, setAssistantStep] = useState(0); // 0: Days, 1: Strengths, 2: Goals, 3: Suggestions/Preview
  const [assistantDays, setAssistantDays] = useState(3);
  const [primaryStrength, setPrimaryStrength] = useState<MuscleGroup | "">("");
  const [secondaryStrength, setSecondaryStrength] = useState<MuscleGroup | "">("");
  const [primaryGoal, setPrimaryGoal] = useState<MuscleGroup | "">("");
  const [secondaryGoal, setSecondaryGoal] = useState<MuscleGroup | "">("");

  // Derived arrays
  const assistantGoals = [primaryGoal, secondaryGoal].filter(Boolean) as MuscleGroup[];
  const [previewSuggested, setPreviewSuggested] = useState<SuggestedDay[]>([]);

  const [newDayName, setNewDayName] = useState("");
  const [dayCopyMode, setDayCopyMode] = useState<'new' | 'copy'>('new');
  const [copySelectedDayId, setCopySelectedDayId] = useState('');
  const copyTriggerRef = useRef(false);

  // Effect: cuando se selecciona un día para copiar, lo clona y luego limpia el flag
  useEffect(() => {
    if (!copySelectedDayId || copyTriggerRef.current) return;
    const source = days.find(d => d.id === copySelectedDayId);
    if (source) {
      copyTriggerRef.current = true;
      addDay(`${source.name} (${language === 'es' ? 'copia' : 'copy'})`, source.exercises);

      const timer = setTimeout(() => {
        copyTriggerRef.current = false;
        setCopySelectedDayId('');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [copySelectedDayId, days, language, addDay]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customExName, setCustomExName] = useState("");
  const [customExMuscle, setCustomExMuscle] = useState<MuscleGroup>("Chest");
  const [customExCategory, setCustomExCategory] = useState<string>("Dumbbell");
  const [customExGrip, setCustomExGrip] = useState<GripType>("Any");
  const [customExSecondary, setCustomExSecondary] = useState<MuscleGroup[]>([]);

  // Inline exercise edit state
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingMusclesPrimary, setEditingMusclesPrimary] = useState<MuscleGroup | "">("");
  const [editingMusclesSecondaries, setEditingMusclesSecondaries] = useState<MuscleGroup[]>([]);
  const [editingCategory, setEditingCategory] = useState<string>("");

  const allExercises = [...EXERCISE_DATABASE, ...customExercises];

  // Rules of Hooks: These must be declared before any conditional returns
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | "all">("all");

  const filteredExercises = useMemo(() => {
    return allExercises
      .filter(ex => {
        const matchesSearch = getExerciseName(ex, language).toLowerCase().includes(exerciseSearch.toLowerCase());
        const matchesMuscle = muscleFilter === "all" || ex.primaryMuscle === muscleFilter;
        return matchesSearch && matchesMuscle;
      })
      .sort((a, b) => a.primaryMuscle.localeCompare(b.primaryMuscle) || getExerciseName(a, language).localeCompare(getExerciseName(b, language)));
  }, [allExercises, exerciseSearch, muscleFilter, language]);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Activity className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 text-sm">Loading Workout Builder...</p>
      </div>
    );
  }

  console.log("BuilderPage rendering. Current hook days:", days);

  const allMuscles = MUSCLE_GROUPS;
  const handleUpdateProfile = (
    primStrength: MuscleGroup | "",
    secStrength: MuscleGroup | "",
    primGoal: MuscleGroup | "",
    secGoal: MuscleGroup | ""
  ) => {
    const strengths = [primStrength, secStrength].filter(Boolean) as MuscleGroup[];
    const goals = [primGoal, secGoal].filter(Boolean) as MuscleGroup[];
    const now = new Date().toISOString();
    setProfile({
      strengths,
      goals,
      createdAt: profile?.createdAt || now,
      lastReviewAt: profile?.lastReviewAt || now
    });
  };

  // Helper for computing suggestions based on current builder state + user selections
  const analysis = analyzeRoutine(days, customExercises, t, language);
  const rawSuggestions = getPersonalizedSuggestions(
    analysis.totalSetsPerMuscle,
    assistantGoals,
    language
  );
  const volumeKeywords = ["volumen", "volume", "overworked", "sobreentrenamiento", "demasiadas", "too many", "excesivo", "excessive", "overtraining"];
  const personalizedSuggestions = rawSuggestions.filter(s => !volumeKeywords.some(kw => s.toLowerCase().includes(kw)));

  const toggleMuscle = (list: MuscleGroup[], item: MuscleGroup, setter: (v: MuscleGroup[]) => void) => {
    setter(list.includes(item) ? list.filter((m: MuscleGroup) => m !== item) : [...list, item]);
  };

  const handleGenerate = () => {
    const suggested = generateSuggestedRoutine(assistantGoals, assistantDays);
    setPreviewSuggested(suggested);
    setAssistantStep(3);
  };

  const handleApplySuggested = () => {
    const newDays = previewSuggested.map((day, i) => ({
      id: `gen_${Date.now()}_${i}`,
      name: language === "es" ? day.name.es : day.name.en,
      exercises: day.exercises.map((ex, j) => ({
        id: `gen_ex_${Date.now()}_${i}_${j}`,
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        restSecs: ex.restSecs
      }))
    }));
    loadSuggestedDays(newDays);
    setIsAssistantOpen(false);
    setAssistantStep(0);
  };

  const handleAddCustomExercise = () => {
    if (customExName.trim()) {
      addCustomExercise({
        id: `custom_${Date.now()}`,
        name: customExName.trim(),
        primaryMuscle: customExMuscle,
        secondaryMuscles: customExSecondary,
        category: customExCategory as ExerciseDef["category"],
        grip: customExGrip,
        estimatedDurationPerSetSecs: 45
      });
      setCustomExName("");
      setCustomExSecondary([]);
      setIsDialogOpen(false);
    }
  };

  const startEditExFull = (day: WorkoutDay, ex: RoutineExercise) => {
    const def = allExercises.find(e => e.id === ex.exerciseId);
    setEditingExId(ex.id);
    setEditingName(ex.customName || (def ? getExerciseName(def, language) : ""));
    setEditingMusclesPrimary(ex.primaryMuscleOverride || (def ? def.primaryMuscle : "" as MuscleGroup));
    const raw = ex.secondaryMusclesOverride || (def ? def.secondaryMuscles : []);
    setEditingMusclesSecondaries([...raw]);
    setEditingCategory(ex.categoryOverride || (def ? def.category : "" as ExerciseDef["category"]));
  };

  const saveEditExFull = (day: WorkoutDay) => {
    if (!editingExId) return;
    const ex = day.exercises.find((e) => e.id === editingExId);
    if (!ex) return;
    const def = allExercises.find(e => e.id === ex.exerciseId);
    const isCustom = ex.exerciseId.startsWith('custom_');

    const newName = editingName.trim();
    const newPrimary = editingMusclesPrimary as MuscleGroup;
    const newSecondaries = editingMusclesSecondaries;
    const newCategory = editingCategory;

    if (isCustom && def) {
      // Editar la definición del ejercicio personalizado directamente
      const defUpdates: Partial<Pick<import('@/lib/exercises').ExerciseDef, 'name' | 'primaryMuscle' | 'secondaryMuscles' | 'category'>> = {};
      if (newName && newName !== def.name) defUpdates.name = newName;
      if (newPrimary && newPrimary !== def.primaryMuscle) defUpdates.primaryMuscle = newPrimary;
      if (JSON.stringify([...newSecondaries].sort()) !== JSON.stringify([...def.secondaryMuscles].sort()))
        defUpdates.secondaryMuscles = newSecondaries;
      if (newCategory && newCategory !== def.category)
        defUpdates.category = newCategory as import('@/lib/exercises').ExerciseDef['category'];

      if (Object.keys(defUpdates).length > 0) {
        updateCustomExerciseDef(ex.exerciseId, defUpdates);
      }

      // Limpiar overrides previos en todas las instancias (ya no son necesarios)
      updateExercisesByExerciseId(ex.exerciseId, {
        customName: undefined,
        primaryMuscleOverride: undefined,
        secondaryMusclesOverride: undefined,
        categoryOverride: undefined,
      });
    } else {
      // Ejercicio predefinido: propagar overrides a TODAS las instancias con el mismo exerciseId
      const overrideUpdates: Partial<RoutineExercise> = {};
      if (newName && newName !== (def ? def.name : '')) overrideUpdates.customName = newName;
      if (newPrimary && newPrimary !== (def ? def.primaryMuscle : '')) overrideUpdates.primaryMuscleOverride = newPrimary;

      // Comparar contra lo que ACTUALMENTE tiene la instancia (override o def original),
      // no solo contra el def original. Si el usuario tenía un override y lo cambió
      // (incluido borrarlo todo), hay que guardar el nuevo estado.
      const currentSecondaries = ex.secondaryMusclesOverride ?? (def ? def.secondaryMuscles : []);
      if (JSON.stringify([...newSecondaries].sort()) !== JSON.stringify([...currentSecondaries].sort())) {
        // Si el nuevo estado coincide con el def original, limpiar el override (no guardarlo)
        const defSecondaries = def ? def.secondaryMuscles : [];
        overrideUpdates.secondaryMusclesOverride =
          JSON.stringify([...newSecondaries].sort()) === JSON.stringify([...defSecondaries].sort())
            ? undefined  // volvió al default → stripUndefined lo omite de Firestore
            : newSecondaries;
      }

      if (newCategory && newCategory !== (def ? def.category : ''))
        overrideUpdates.categoryOverride = newCategory as RoutineExercise['categoryOverride'];

      if (Object.keys(overrideUpdates).length > 0) {
        updateExercisesByExerciseId(ex.exerciseId, overrideUpdates);
      }
    }

    setEditingExId(null);
    setEditingName('');
    setEditingMusclesPrimary('');
    setEditingMusclesSecondaries([]);
    setEditingCategory('');
  };

  const cancelEditExFull = () => {
    setEditingExId(null);
    setEditingName("");
    setEditingMusclesPrimary("");
    setEditingMusclesSecondaries([]);
    setEditingCategory("");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {t.build_title} <span className="text-sm font-mono text-emerald-500 font-normal">({days.length} {t.build_days})</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">{t.build_subtitle}</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
          <Button onClick={() => setIsAssistantOpen(true)} className="w-full sm:w-auto bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white dark:text-black font-semibold shadow-md border-0 shrink-0">
            <Sparkles className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Asistente Inteligente' : 'Smart Assistant'}
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
            {/* Toggle new / copy */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setDayCopyMode('new')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${dayCopyMode === 'new'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-700'
                  }`}
              >
                {language === 'es' ? 'Nuevo Día' : 'New Day'}
              </button>
              <button
                type="button"
                onClick={() => setDayCopyMode('copy')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${dayCopyMode === 'copy'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-700'
                  }`}
              >
                {language === 'es' ? 'Copiar Día' : 'Copy Day'}
              </button>
            </div>

            {dayCopyMode === 'new' ? (
              <>
                <Input
                  id="new-day-name-input"
                  name="new-day-name-input"
                  placeholder={t.build_add_day_placeholder}
                  value={newDayName}
                  onChange={(e) => setNewDayName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const name = newDayName.trim() || (language === "es" ? `Día ${days.length + 1}` : `Day ${days.length + 1}`);
                      addDay(name);
                      setNewDayName("");
                    }
                  }}
                  className="flex-1 sm:w-48 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />
                <Button
                  type="button"
                  onClick={() => {
                    const name = newDayName.trim() || (language === "es" ? `Día ${days.length + 1}` : `Day ${days.length + 1}`);
                    addDay(name);
                    setNewDayName("");
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" /> {t.build_add_day_btn}
                </Button>
              </>
            ) : (
              <div className="flex-1 flex gap-2">
                {/* Search / select existing day to copy */}
                <select
                  className="flex-1 sm:w-48 h-10 px-3 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  value={copySelectedDayId}
                  onChange={(e) => setCopySelectedDayId(e.target.value)}
                >
                  <option value="" disabled hidden>
                    {language === 'es' ? 'Elegir día a copiar...' : 'Choose a day to copy...'}
                  </option>
                  {days
                    .filter(d => d.exercises.length > 0)
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.exercises.length} {t.build_exercises})
                      </option>
                    ))
                  }
                </select>
                {days.filter(d => d.exercises.length > 0).length === 0 && (
                  <span className="text-[11px] text-zinc-400 self-center whitespace-nowrap">
                    {language === 'es' ? 'Agregá ejercicios primero' : 'Add exercises first'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Muscle Profile Selector Panel */}
      <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 mb-8 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {language === 'es' ? 'Mi Perfil Muscular' : 'My Muscle Profile'}
          </h2>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/20">
            {language === 'es' ? 'Puntos Fuertes y Débiles' : 'Strong & Weak Points'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Primary Strong Point */}
          <div className="grid gap-1.5 text-left">
            <Label htmlFor="top-primary-strength" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {language === 'es' ? 'Fuerte Principal *' : 'Primary Strong *'}
            </Label>
            <select
              id="top-primary-strength"
              className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-50"
              value={profile?.strengths[0] || ""}
              onChange={e => handleUpdateProfile(
                e.target.value as MuscleGroup,
                profile?.strengths[1] || "",
                profile?.goals[0] || "",
                profile?.goals[1] || ""
              )}
            >
              <option value="">
                {language === 'es' ? 'Seleccionar...' : 'Select...'}
              </option>
              {allMuscles.map((m: MuscleGroup) => (
                <option key={m} value={m}>
                  {getMuscleLabel(m, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Strong Point */}
          <div className="grid gap-1.5 text-left">
            <Label htmlFor="top-secondary-strength" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {language === 'es' ? 'Fuerte Secundario' : 'Secondary Strong Point'}
            </Label>
            <select
              id="top-secondary-strength"
              className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-50"
              value={profile?.strengths[1] || ""}
              onChange={e => handleUpdateProfile(
                profile?.strengths[0] || "",
                e.target.value as MuscleGroup,
                profile?.goals[0] || "",
                profile?.goals[1] || ""
              )}
            >
              <option value="">
                {language === 'es' ? 'Ninguno' : 'None'}
              </option>
              {allMuscles.filter((m: MuscleGroup) => m !== (profile?.strengths[0] || "")).map((m: MuscleGroup) => (
                <option key={m} value={m}>
                  {getMuscleLabel(m, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Primary Weak Point */}
          <div className="grid gap-1.5 text-left">
            <Label htmlFor="top-primary-goal" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {language === 'es' ? 'Débil Principal *' : 'Primary Weak *'}
            </Label>
            <select
              id="top-primary-goal"
              className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-50"
              value={profile?.goals[0] || ""}
              onChange={e => handleUpdateProfile(
                profile?.strengths[0] || "",
                profile?.strengths[1] || "",
                e.target.value as MuscleGroup,
                profile?.goals[1] || ""
              )}
            >
              <option value="">
                {language === 'es' ? 'Seleccionar...' : 'Select...'}
              </option>
              {allMuscles.filter((m: MuscleGroup) => m !== (profile?.strengths[0] || "") && m !== (profile?.strengths[1] || "")).map((m: MuscleGroup) => (
                <option key={m} value={m}>
                  {getMuscleLabel(m, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Weak Point */}
          <div className="grid gap-1.5 text-left">
            <Label htmlFor="top-secondary-goal" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {language === 'es' ? 'Débil Secundario' : 'Secondary Weak'}
            </Label>
            <select
              id="top-secondary-goal"
              className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-805 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-50"
              value={profile?.goals[1] || ""}
              onChange={e => handleUpdateProfile(
                profile?.strengths[0] || "",
                profile?.strengths[1] || "",
                profile?.goals[0] || "",
                e.target.value as MuscleGroup
              )}
            >
              <option value="">
                {language === 'es' ? 'Ninguno' : 'None'}
              </option>
              {allMuscles.filter((m: MuscleGroup) => m !== (profile?.strengths[0] || "") && m !== (profile?.strengths[1] || "") && m !== (profile?.goals[0] || "")).map((m: MuscleGroup) => (
                <option key={m} value={m}>
                  {getMuscleLabel(m, language)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="text-center py-24 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200 dark:border-zinc-800 border-dashed">
          <Dumbbell className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-2">{t.tracker_no_days}</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">{t.tracker_no_days_desc}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <Card key={day.id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl overflow-hidden">
              <CardHeader className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Input
                    id={`day-name-${day.id}`}
                    name={`day-name-${day.id}`}
                    value={day.name}
                    onChange={(e) => updateDayName(day.id, e.target.value)}
                    className="h-8 w-48 font-semibold text-lg bg-transparent border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                  />
                  <Badge variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">{day.exercises.length} {t.build_exercises}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeDay(day.id)} className="text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {day.exercises.map((ex, exIdx) => {
                    const exerciseDef = allExercises.find(e => e.id === ex.exerciseId);
                    const effectivePrimary: MuscleGroup = ex.primaryMuscleOverride || (exerciseDef ? exerciseDef.primaryMuscle : "Chest" as MuscleGroup);
                    const effectiveSecondaries: MuscleGroup[] = ex.secondaryMusclesOverride || (exerciseDef ? exerciseDef.secondaryMuscles : []);
                    const isEditing = editingExId === ex.id;
                    const isCardio = exerciseDef?.category?.includes('Cardio');
                    return (
                      <div key={ex.id} className="p-4 sm:p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors flex flex-col gap-3">
                        {/* Name row */}
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              autoFocus
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { } // handled by parent button
                              }}
                              className="h-8 flex-1 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200"
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={() => saveEditExFull(day)} className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-400/10">✓</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={cancelEditExFull} className="text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-400/10">✕</Button>
                          </div>
                        ) : (
                          <h4 className="font-medium text-zinc-900 dark:text-zinc-200">{ex.customName || (exerciseDef ? getExerciseName(exerciseDef, language) : t.build_unknown_ex)}</h4>
                        )}

                        {/* Muscle editing — shown under name when in edit mode or as text otherwise */}
                        {isEditing ? (
                          <div className="space-y-2 pt-1">
                            {/* Primary muscle selector */}
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] font-semibold text-zinc-500 w-14 shrink-0">
                                {language === 'es' ? 'Principal' : 'Primary'}
                              </Label>
                              <select
                                className="flex h-8 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-50"
                                value={editingMusclesPrimary}
                                onChange={e => {
                                  const newMuscle = e.target.value as MuscleGroup;
                                  setEditingMusclesPrimary(newMuscle);
                                  if (newMuscle === 'Cardio') setEditingCategory('Soft Cardio');
                                  else if (editingCategory.includes('Cardio')) setEditingCategory('Barbell');
                                }}
                              >
                                <option value="" disabled>{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                                {allMuscles.map((m: MuscleGroup) => (
                                  <option key={m} value={m}>{getMuscleLabel(m, language)}</option>
                                ))}
                              </select>
                            </div>
                            {/* Secondaries chips */}
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] font-semibold text-zinc-500 w-14 shrink-0">
                                {language === 'es' ? 'Secundarios' : 'Secondary'}
                              </Label>
                              <div className="flex flex-wrap gap-1">
                                {allMuscles.map((m: MuscleGroup) => {
                                  const isSelected = editingMusclesSecondaries.includes(m);
                                  const sameAsPrimary = m === editingMusclesPrimary;
                                  return (
                                    <button
                                      key={m}
                                      type="button"
                                      disabled={sameAsPrimary}
                                      onClick={() => toggleMuscle(editingMusclesSecondaries, m, setEditingMusclesSecondaries)}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer ${isSelected
                                        ? 'bg-emerald-500 text-white border-emerald-500 dark:text-black'
                                        : sameAsPrimary
                                          ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-600 border-zinc-100 dark:border-zinc-800 cursor-not-allowed opacity-50'
                                          : 'bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                                        }`}
                                    >
                                      {getMuscleLabel(m, language)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {/* Category selector */}
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] font-semibold text-zinc-500 w-14 shrink-0">
                                {language === 'es' ? 'Categoría' : 'Category'}
                              </Label>
                              <select
                                className="flex h-8 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-50"
                                value={editingCategory}
                                onChange={e => setEditingCategory(e.target.value)}
                              >
                                {(editingMusclesPrimary === 'Cardio'
                                  ? ['Soft Cardio', 'Moderate Cardio', 'Intense Cardio']
                                  : ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith Machine', 'Plyometrics']
                                ).map(cat => (
                                  <option key={cat} value={cat}>{getCategoryLabel(cat, language)}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500 mt-0">
                            {getMuscleLabel(effectivePrimary, language)}
                            {effectiveSecondaries.length > 0 && (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1.5 font-normal">
                                ({language === 'es' ? 'Secundarios: ' : 'Secondary: '}
                                {effectiveSecondaries.map((m) => getMuscleLabel(m, language)).join(', ')}
                                <span className="text-[10px] opacity-75 font-mono ml-1 font-bold">
                                  {exerciseDef?.category?.includes('Cardio') ? '' : (language === 'es' ? ' +0.5 series/serie' : ' +0.5 sets/set')}
                                </span>
                                )
                              </span>
                            )}
                            • {getCategoryLabel(ex.categoryOverride || exerciseDef?.category || 'Barbell', language)} {exerciseDef?.grip ? `• ${t[`grip_${exerciseDef.grip}` as keyof typeof t]}` : ''}
                          </p>
                        )}

                        {/* Controls row: sets/reps/rest + muscle toggle + edit/delete */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                              <Hash className="w-3 h-3" /> {isCardio ? (language === 'es' ? 'Intervalos' : 'Intervals') : t.build_sets}
                            </div>
                            <Input
                              type="number"
                              min="1" max="10"
                              value={ex.sets}
                              onChange={(e) => updateExerciseInDay(day.id, ex.id, { sets: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500"
                              disabled={isEditing}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                              <Repeat className="w-3 h-3" /> {isCardio ? 'Km' : t.build_reps}
                            </div>
                            <Input
                              type="number"
                              min={isCardio ? "0.1" : "1"}
                              step={isCardio ? "0.5" : "1"}
                              max="100"
                              value={ex.reps}
                              onChange={(e) => updateExerciseInDay(day.id, ex.id, { reps: isCardio ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500"
                              disabled={isEditing}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                              {isCardio ? <Clock className="w-3 h-3" /> : <Dumbbell className="w-3 h-3" />} {isCardio ? (language === 'es' ? 'Tiempo (HH:MM)' : 'Time (HH:MM)') : (language === 'es' ? 'Peso (kg)' : 'Weight (kg)')}
                            </div>
                            {isCardio ? (
                              <Input
                                type="text"
                                placeholder="HH:MM"
                                value={`${Math.floor((ex.weightKg || 0) / 3600)}:${Math.floor(((ex.weightKg || 0) % 3600) / 60).toString().padStart(2, '0')}`}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.includes(':')) {
                                    const [h, m] = val.split(':').map(p => parseInt(p) || 0);
                                    updateExerciseInDay(day.id, ex.id, { weightKg: (h * 3600) + (m * 60) });
                                  } else {
                                    const mins = parseInt(val) || 0;
                                    updateExerciseInDay(day.id, ex.id, { weightKg: mins * 60 });
                                  }
                                }}
                                className="w-20 h-8 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500"
                                disabled={isEditing}
                              />
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                step="2.5"
                                value={ex.weightKg || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateExerciseInDay(day.id, ex.id, { weightKg: val });
                                }}
                                className="w-16 h-8 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500"
                                disabled={isEditing}
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                              <Clock className="w-3 h-3" /> {t.build_rest}
                            </div>
                            <Input
                              type="number"
                              min="0" step="15"
                              value={ex.restSecs}
                              onChange={(e) => updateExerciseInDay(day.id, ex.id, { restSecs: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500"
                              disabled={isEditing}
                            />
                          </div>

                          {!isEditing && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => startEditExFull(day, ex)} className="text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-400/10">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <div className="flex items-center">
                                <Button variant="ghost" size="icon" disabled={exIdx === 0} onClick={() => reorderExerciseInDay(day.id, exIdx, exIdx - 1)} className="h-8 w-8 text-zinc-400">
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" disabled={exIdx === day.exercises.length - 1} onClick={() => reorderExerciseInDay(day.id, exIdx, exIdx + 1)} className="h-8 w-8 text-zinc-400">
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => removeExerciseGlobal(ex.id)} className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 ml-auto">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-2">
                  <div className="flex flex-1 gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                        className="pl-9 h-10"
                        value={exerciseSearch}
                        onChange={(e) => setExerciseSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="w-32 h-10 px-2 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                      value={muscleFilter}
                      onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup)}
                    >
                      <option value="all">{language === 'es' ? 'Todos' : 'All'}</option>
                      {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{getMuscleLabel(m, language)}</option>)}
                    </select>
                  </div>
                  <select
                    className="w-full sm:flex-1 h-10 px-3 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    onChange={(e) => {
                      const exId = e.target.value;
                      if (exId) {
                        const def = allExercises.find(x => x.id === exId);
                        const isC = def?.category.includes('Cardio');
                        addExerciseToDay(day.id, {
                          id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          exerciseId: exId,
                          sets: isC ? 1 : 3,
                          reps: isC ? 5 : 10,
                          weightKg: isC ? 1800 : 0, // 30 min por defecto para cardio
                          restSecs: isC ? 0 : 90
                        } as RoutineExercise);
                        e.target.value = ""; // reset
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>{t.build_add_ex_placeholder}</option>
                    {filteredExercises.length === 0 ? (
                      <option disabled>{language === 'es' ? 'No hay ejercicios que cumplan con el filtro' : 'No exercises match the filter'}</option>
                    ) : (
                      filteredExercises.map((ex: ExerciseDef) => (
                        <option key={ex.id} value={ex.id}>
                          {getExerciseName(ex, language)} ({getMuscleLabel(ex.primaryMuscle, language)})
                        </option>
                      ))
                    )}
                  </select>

                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger render={
                      <Button variant="outline" className="w-full sm:w-auto border-zinc-200 dark:border-zinc-700 shrink-0">
                        <Plus className="w-4 h-4 mr-2" /> {t.build_create_ex_btn}
                      </Button>
                    } />
                    <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50">
                      <DialogHeader>
                        <DialogTitle>{t.dialog_add_ex_title}</DialogTitle>
                        <DialogDescription>{t.dialog_add_ex_desc}</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">{t.dialog_ex_name}</Label>
                          <Input id="name" value={customExName} onChange={e => setCustomExName(e.target.value)} className="bg-white dark:bg-zinc-900" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="muscle">{t.dialog_ex_primary}</Label>
                          <select
                            id="muscle"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-50"
                            value={customExMuscle}
                            onChange={e => {
                              const newMuscle = e.target.value as MuscleGroup;
                              setCustomExMuscle(newMuscle);
                              if (newMuscle === 'Cardio') setCustomExCategory('Soft Cardio');
                              else if (customExCategory.includes('Cardio')) setCustomExCategory('Barbell');
                            }}
                          >
                            {MUSCLE_GROUPS.map((m: MuscleGroup) => <option key={m} value={m}>{getMuscleLabel(m, language)}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="category">{t.dialog_ex_category}</Label>
                          <select
                            id="category"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={customExCategory}
                            onChange={e => setCustomExCategory(e.target.value)}
                          >
                            {(customExMuscle === 'Cardio'
                              ? ['Soft Cardio', 'Moderate Cardio', 'Intense Cardio']
                              : ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith Machine', 'Plyometrics']
                            ).map(cat => (
                              <option key={cat} value={cat}>{getCategoryLabel(cat, language)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="grip">{language === 'es' ? 'Tipo de Agarre' : 'Grip Type'}</Label>
                          <select
                            id="grip"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={customExGrip}
                            onChange={e => setCustomExGrip(e.target.value as GripType)}
                          >
                            <option value="Pronated">{t.grip_Pronated}</option>
                            <option value="Supinated">{t.grip_Supinated}</option>
                            <option value="Neutral">{t.grip_Neutral}</option>
                            <option value="Mixed">{t.grip_Mixed}</option>
                            <option value="Wide">{t.grip_Wide}</option>
                            <option value="Close">{t.grip_Close}</option>
                            <option value="Any">{t.grip_Any}</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label>{language === 'es' ? 'Músculos Secundarios (Opcional)' : 'Secondary Muscles (Optional)'}</Label>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-900/50">
                            {([...allMuscles] as MuscleGroup[]).filter((m: MuscleGroup) => m !== customExMuscle).map((m: MuscleGroup) => {
                              const isSelected = customExSecondary.includes(m);
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => {
                                    setCustomExSecondary((prev: MuscleGroup[]) =>
                                      prev.includes(m) ? prev.filter((x: MuscleGroup) => x !== m) : [...prev, m]
                                    );
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${isSelected
                                    ? 'bg-emerald-500 text-white border-emerald-500 dark:text-black shadow-xs'
                                    : 'bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                                    }`}
                                >
                                  {getMuscleLabel(m, language)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={handleAddCustomExercise} className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black">
                          {t.dialog_ex_save}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Smart Assistant Dialog */}
      <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              {language === 'es' ? 'Asistente de Rutina Inteligente' : 'Smart Routine Assistant'}
            </DialogTitle>
            <DialogDescription>
              {language === 'es'
                ? 'Optimizá tu rutina actual o generá una nueva según tus objetivos.'
                : 'Optimize your current routine or generate a new one based on your goals.'}
            </DialogDescription>
          </DialogHeader>

          {assistantStep === 0 && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-zinc-500">
                {language === 'es'
                  ? '¿Cuántos días por semana querés entrenar?'
                  : 'How many days per week do you want to train?'}
              </p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => setAssistantDays(d)}
                    type="button"
                    className={`w-12 h-12 rounded-xl border text-lg font-bold transition-all ${assistantDays === d
                      ? 'bg-emerald-500 border-emerald-500 text-white dark:text-black shadow-md scale-105'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500'
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setAssistantStep(1)} className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black">
                  {language === 'es' ? 'Siguiente' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {assistantStep === 1 && (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                  {language === 'es' ? 'Tus Puntos Fuertes' : 'Your Strong Points'}
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                  {language === 'es'
                    ? 'Elegí qué grupos musculares considerás tus puntos fuertes principales y secundarios.'
                    : 'Choose which muscle groups you consider your primary and secondary strong points.'}
                </p>
              </div>

              <div className="space-y-4 text-left">
                {/* Primary Strength Select */}
                <div className="grid gap-2">
                  <Label htmlFor="primary-strength">
                    {language === 'es' ? 'Punto Fuerte Principal *' : 'Primary Strong Point *'}
                  </Label>
                  <select
                    id="primary-strength"
                    className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-55"
                    value={primaryStrength}
                    onChange={e => setPrimaryStrength(e.target.value as MuscleGroup)}
                  >
                    <option value="" disabled>
                      {language === 'es' ? 'Seleccionar punto fuerte principal...' : 'Select primary strong point...'}
                    </option>
                    {allMuscles.map((m: MuscleGroup) => (
                      <option key={m} value={m}>
                        {getMuscleLabel(m, language)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Secondary Strength Select */}
                <div className="grid gap-2">
                  <Label htmlFor="secondary-strength">
                    {language === 'es' ? 'Punto Fuerte Secundario' : 'Secondary Strong Point'}
                  </Label>
                  <select
                    id="secondary-strength"
                    className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-55"
                    value={secondaryStrength}
                    onChange={e => setSecondaryStrength(e.target.value as MuscleGroup)}
                  >
                    <option value="">
                      {language === 'es' ? 'Ninguno' : 'None'}
                    </option>
                    {allMuscles.filter((m: MuscleGroup) => m !== primaryStrength).map((m: MuscleGroup) => (
                      <option key={m} value={m}>
                        {getMuscleLabel(m, language)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setAssistantStep(0)} className="border-zinc-200 dark:border-zinc-800">
                  {language === 'es' ? 'Atrás' : 'Back'}
                </Button>
                <Button
                  disabled={!primaryStrength}
                  onClick={() => setAssistantStep(2)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black disabled:opacity-50"
                >
                  {language === 'es' ? 'Siguiente' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {assistantStep === 2 && (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                  {language === 'es' ? 'Tus Puntos Débiles (Objetivos)' : 'Your Weak Points (Goals)'}
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                  {language === 'es'
                    ? 'Elegí qué grupos musculares considerás tus puntos débiles principales y secundarios a priorizar.'
                    : 'Choose which muscle groups you consider your primary and secondary weak points to prioritize.'}
                </p>
              </div>

              <div className="space-y-4 text-left">
                {/* Primary Weak Point Select */}
                <div className="grid gap-2">
                  <Label htmlFor="primary-goal">
                    {language === 'es' ? 'Punto Débil Principal *' : 'Primary Weak Point *'}
                  </Label>
                  <select
                    id="primary-goal"
                    className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-55"
                    value={primaryGoal}
                    onChange={e => setPrimaryGoal(e.target.value as MuscleGroup)}
                  >
                    <option value="" disabled>
                      {language === 'es' ? 'Seleccionar punto débil principal...' : 'Select primary weak point...'}
                    </option>
                    {allMuscles.filter((m: MuscleGroup) => m !== primaryStrength && m !== secondaryStrength).map((m: MuscleGroup) => (
                      <option key={m} value={m}>
                        {getMuscleLabel(m, language)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Secondary Weak Point Select */}
                <div className="grid gap-2">
                  <Label htmlFor="secondary-goal">
                    {language === 'es' ? 'Punto Débil Secundario' : 'Secondary Weak Point'}
                  </Label>
                  <select
                    id="secondary-goal"
                    className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-55"
                    value={secondaryGoal}
                    onChange={e => setSecondaryGoal(e.target.value as MuscleGroup)}
                  >
                    <option value="">
                      {language === 'es' ? 'Ninguno' : 'None'}
                    </option>
                    {allMuscles.filter((m: MuscleGroup) => m !== primaryStrength && m !== secondaryStrength && m !== primaryGoal).map((m: MuscleGroup) => (
                      <option key={m} value={m}>
                        {getMuscleLabel(m, language)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setAssistantStep(1)} className="border-zinc-200 dark:border-zinc-800">
                  {language === 'es' ? 'Atrás' : 'Back'}
                </Button>
                <Button
                  disabled={!primaryGoal}
                  onClick={handleGenerate}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black disabled:opacity-50"
                >
                  {language === 'es' ? 'Generar Sugerencias' : 'Generate Suggestions'} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {assistantStep === 3 && (
            <div className="space-y-6 py-4">
              {/* Part 1: Personalized Suggestions based on current split */}
              <div>
                <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  {language === 'es' ? 'Sugerencias para tu rutina actual:' : 'Suggestions for your current routine:'}
                </h3>
                {days.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    {language === 'es'
                      ? 'No tenés una rutina ingresada en el builder todavía para comparar.'
                      : 'You do not have a routine in the builder yet to compare.'}
                  </p>
                ) : personalizedSuggestions.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    {language === 'es'
                      ? '¡Tu rutina ingresada se ve excelente! No se detectaron desbalances.'
                      : 'Your routine looks great! No imbalances detected.'}
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {personalizedSuggestions.map((s, idx) => (
                      <li key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5 leading-relaxed bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Part 2: Load suggestion split preview */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mb-3">
                  {language === 'es' ? 'Nueva Rutina Sugerida:' : 'New Suggested Routine:'}
                </h3>
                <p className="text-xs text-zinc-500 mb-3">
                  {language === 'es'
                    ? `Hemos optimizado una rutina completa de ${assistantDays} días enfocada en tus objetivos.`
                    : `We have optimized a complete ${assistantDays}-day routine focused on your goals.`}
                </p>

                <div className="max-h-40 overflow-y-auto space-y-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  {previewSuggested.map((day, dIdx) => (
                    <div key={dIdx} className="text-xs pb-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {language === 'es' ? day.name.es : day.name.en}
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {day.exercises.slice(0, 4).map(ex => {
                          const def = EXERCISE_DATABASE.find(e => e.id === ex.exerciseId);
                          return def ? getExerciseName(def, language) : ex.exerciseId;
                        }).join(', ')}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleApplySuggested} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-semibold">
                  {language === 'es' ? 'Cargar esta Rutina Sugerida' : 'Load this Suggested Routine'}
                </Button>
                <Button variant="ghost" onClick={() => setIsAssistantOpen(false)} className="text-zinc-500 text-xs">
                  {language === 'es' ? 'Mantener mi rutina actual' : 'Keep my current routine'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
