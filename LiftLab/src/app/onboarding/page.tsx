"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, UserProfile } from "@/store/useStore";
import { translations, getMuscleLabel } from "@/lib/i18n";
import { MuscleGroup, EXERCISE_DATABASE, getExerciseName } from "@/lib/exercises";
import { generateSuggestedRoutine, SuggestedDay } from "@/lib/suggestions";
import { Button } from "@/components/ui/button";
import { Activity, ChevronRight, Check, RefreshCcw } from "lucide-react";

// Muscle groups grouped for display
const MUSCLE_SECTIONS = [
  { label: { en: "Upper Body", es: "Tren Superior" }, muscles: ["Chest", "Lats", "Front Delts", "Biceps", "Triceps"] as MuscleGroup[] },
  { label: { en: "Lower Body", es: "Tren Inferior" }, muscles: ["Quads", "Hamstrings", "Glutes", "Calves"] as MuscleGroup[] },
  { label: { en: "Core", es: "Core" }, muscles: ["Abs"] as MuscleGroup[] },
  { label: { en: "Others", es: "Otros" }, muscles: ["Forearms", "Traps", "Cardio"] as MuscleGroup[] },
];



function MuscleChip({ muscle, selected, onToggle, lang }: {
  muscle: MuscleGroup; selected: boolean; onToggle: () => void; lang: "en" | "es";
}) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all select-none ${selected
        ? "bg-emerald-500 border-emerald-500 text-white dark:text-black shadow-md scale-105"
        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
        }`}
    >
      {selected && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
      {getMuscleLabel(muscle, lang)}
    </button>
  );
}

function MuscleSelector({ selected, onToggle, lang }: {
  selected: MuscleGroup[]; onToggle: (m: MuscleGroup) => void; lang: "en" | "es";
}) {
  return (
    <div className="space-y-4">
      {MUSCLE_SECTIONS.map(section => (
        <div key={section.label.en}>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
            {lang === "es" ? section.label.es : section.label.en}
          </p>
          <div className="flex flex-wrap gap-2">
            {section.muscles.map(m => (
              <MuscleChip key={m} muscle={m} selected={selected.includes(m)} onToggle={() => onToggle(m)} lang={lang} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SuggestedRoutinePreview({ days, lang }: { days: SuggestedDay[]; lang: "en" | "es" }) {
  return (
    <div className="space-y-3">
      {days.map((day, i) => {
        const dayName = lang === "es" ? day.name.es : day.name.en;
        return (
          <div key={i} className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{dayName}</h3>
              <p className="text-xs text-zinc-500">{day.exercises.length} {lang === 'es' ? 'ejercicios · 4 series c/u' : 'exercises · 4 sets each'}</p>
            </div>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {day.exercises.map((ex, j) => {
                const def = EXERCISE_DATABASE.find(e => e.id === ex.exerciseId);
                return (
                  <li key={j} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {def ? getExerciseName(def, lang) : ex.exerciseId}
                    </span>
                    <span className="text-xs text-zinc-400">{ex.sets}×{ex.reps}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const { language, setProfile, loadSuggestedDays, workoutHistory } = useStore();
  const t = translations[language];
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReview = searchParams.get("review") === "true";

  const [step, setStep] = useState(isReview ? 1 : 0); // 0=welcome, 1=strengths, 2=goals, 3=routine
  const [strengths, setStrengths] = useState<MuscleGroup[]>([]);
  const [goals, setGoals] = useState<MuscleGroup[]>([]);
  const [suggested, setSuggested] = useState<SuggestedDay[]>([]);

  const toggle = (list: MuscleGroup[], item: MuscleGroup, setter: (v: MuscleGroup[]) => void) => {
    setter(list.includes(item) ? list.filter(m => m !== item) : [...list, item]);
  };

  const goToStep3 = () => {
    const days = generateSuggestedRoutine(goals);
    setSuggested(days);
    setStep(3);
  };

  const saveProfile = (navigateTo: string) => {
    const now = new Date().toISOString();
    const profile: UserProfile = { strengths, goals, createdAt: now, lastReviewAt: now };
    setProfile(profile);
    router.push(navigateTo);
  };

  const handleLoadRoutine = () => {
    const now = new Date().toISOString();
    setProfile({ strengths, goals, createdAt: now, lastReviewAt: now });
    const newDays = suggested.map((day, i) => ({
      id: (Date.now() + i).toString(),
      name: language === "es" ? day.name.es : day.name.en,
      exercises: day.exercises.map((ex, j) => ({
        id: (Date.now() + i * 100 + j).toString(),
        ...ex,
      })),
    }));
    loadSuggestedDays(newDays);
    router.push("/builder");
  };

  const handleSkip = () => saveProfile("/builder");

  // Progress stats for review
  const { last30, avgEff } = useMemo(() => {
    const nowTs = Date.now();
    const last30Sessions = workoutHistory.filter(s => nowTs - new Date(s.date).getTime() < 30 * 86400000);
    const avg = last30Sessions.length ? Math.round(last30Sessions.reduce((a, s) => a + s.efficiencyScore, 0) / last30Sessions.length) : null;
    return { last30: last30Sessions, avgEff: avg };
  }, [workoutHistory]);

  const TOTAL_STEPS = 3;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <Activity className="w-7 h-7 text-emerald-500" />
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Lift<span className="text-zinc-400">Lab</span>
          </span>
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center">
            {isReview ? (
              <>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-sm font-medium mb-6">
                  <RefreshCcw className="w-4 h-4" /> {t.ob_review_title}
                </div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">{t.ob_review_title}</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">{t.ob_review_sub}</p>
                {avgEff !== null && (
                  <div className="inline-flex flex-col items-center px-6 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-6">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">{t.prog_avg_eff} (30d)</span>
                    <span className="text-5xl font-black text-emerald-500">{avgEff}</span>
                    <span className="text-sm text-zinc-400">/ 100</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">{t.ob_welcome_title}</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8">{t.ob_welcome_sub}</p>
              </>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setStep(1)} className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black px-8">
                {t.ob_btn_next} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              {!isReview && (
                <Button variant="ghost" onClick={() => saveProfile("/builder")} className="text-zinc-500">
                  {t.ob_btn_skip}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Steps 1-3 */}
        {step > 0 && (
          <>
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"}`} />
              ))}
              <span className="text-xs text-zinc-400 ml-1 shrink-0">{step} {t.ob_step_of} {TOTAL_STEPS}</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
              {/* Step 1 */}
              {step === 1 && (
                <>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">{t.ob_step1_title}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t.ob_step1_sub}</p>
                  <MuscleSelector selected={strengths} onToggle={m => toggle(strengths, m, setStrengths)} lang={language} />
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setStep(0)} className="border-zinc-200 dark:border-zinc-700">{t.ob_btn_back}</Button>
                    <Button onClick={() => setStep(2)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black">
                      {t.ob_btn_next} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">{t.ob_step2_title}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t.ob_step2_sub}</p>
                  <MuscleSelector selected={goals} onToggle={m => toggle(goals, m, setGoals)} lang={language} />
                  {goals.length === 0 && (
                    <p className="text-xs text-amber-500 mt-3">{t.ob_no_goals}</p>
                  )}
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setStep(1)} className="border-zinc-200 dark:border-zinc-700">{t.ob_btn_back}</Button>
                    <Button onClick={goToStep3} disabled={goals.length === 0} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black disabled:opacity-50">
                      {t.ob_btn_next} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">{t.ob_step3_title}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t.ob_step3_sub}</p>
                  <div className="max-h-80 overflow-y-auto pr-1 mb-6 space-y-3">
                    <SuggestedRoutinePreview days={suggested} lang={language} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleLoadRoutine} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-semibold py-5">
                      {t.ob_btn_load}
                    </Button>
                    <Button variant="ghost" onClick={handleSkip} className="text-zinc-500 text-sm">
                      {t.ob_btn_skip}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
