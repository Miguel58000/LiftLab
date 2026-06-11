"use client";

import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { useStore } from "@/store/useStore";
import { translations } from "@/lib/i18n";
import { Activity, Dumbbell, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const language = useStore((s) => s.language) as "en" | "es";
  const setLanguage = useStore((s) => s.setLanguage);
  const t = translations[language as keyof typeof translations];

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : t.login_error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="lg:w-1/2 bg-zinc-950 flex flex-col justify-between p-10 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.15),transparent_60%)]" />
        
        {/* Logo */}
        <div className="relative flex items-center gap-2">
          <Activity className="w-7 h-7 text-emerald-400" />
          <span className="text-2xl font-bold text-white">Lift<span className="text-zinc-400">Lab</span></span>
        </div>

        {/* Hero text */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" /> {t.hero_badge}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            {t.hero_title_1}<br />
            <span className="text-emerald-400">{t.hero_title_2}</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-md">{t.hero_subtitle}</p>
        </div>

        {/* Feature list */}
        <div className="relative grid grid-cols-1 gap-3">
          {[
            { icon: <Dumbbell className="w-4 h-4 text-emerald-400" />, text: t.feat_vol_title },
            { icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, text: t.feat_bal_title },
            { icon: <Activity className="w-4 h-4 text-emerald-400" />, text: t.feat_ins_title },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 text-zinc-300 text-sm">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">{f.icon}</div>
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-10 bg-white dark:bg-zinc-950 lg:bg-zinc-50 lg:dark:bg-zinc-900 relative">
        {/* Language Switcher */}
        <div className="absolute top-6 right-6 flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setLanguage("es")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              language === "es"
                ? "bg-white dark:bg-zinc-700 text-emerald-500 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            ES
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              language === "en"
                ? "bg-white dark:bg-zinc-700 text-emerald-500 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            EN
          </button>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {isSignUp ? (language === "es" ? "Crear una cuenta" : "Create an account") : t.login_title}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            {isSignUp
              ? (language === "es"
                  ? "Unite a LiftLab para llevar tus entrenamientos al siguiente nivel."
                  : "Join LiftLab to take your workouts to the next level.")
              : t.login_sub}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.login_email}</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.login_password}</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-semibold py-6">
              {isSignUp ? t.login_signup : t.login_signin}
            </Button>
          </form>

          <div className="relative flex items-center py-2 mb-6">
            <div className="grow border-t border-zinc-200 dark:border-zinc-800"></div>
            <span className="shrink-0 px-4 text-xs text-zinc-400 uppercase tracking-wider">{t.login_or}</span>
            <div className="grow border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>

          <button
            onClick={signInWithGoogle}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-semibold hover:border-emerald-500 hover:shadow-lg transition-all group mb-6"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t.login_google}
          </button>

          <div className="text-center text-sm text-zinc-500 mb-6">
            {isSignUp ? t.login_has_account : t.login_no_account}{" "}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-emerald-500 hover:text-emerald-600 font-medium">
              {isSignUp ? t.login_signin : t.login_signup}
            </button>
          </div>

          <p className="text-center text-xs text-zinc-400">{t.login_privacy}</p>
        </div>
      </div>
    </div>
  );
}
