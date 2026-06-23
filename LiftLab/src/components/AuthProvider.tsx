"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, UserCredential, sendEmailVerification } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { loadUserData, saveUserData } from "@/lib/firestore";
import { useStore } from "@/store/useStore";
import { useRouter, usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { Language } from "@/lib/i18n";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<UserCredential>;
  signUpWithEmail: (e: string, p: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, signInWithGoogle: async () => { }, signInWithEmail: async () => ({} as UserCredential), signUpWithEmail: async () => ({} as UserCredential), logout: async () => { } });
export const useAuth = () => useContext(AuthContext);

function debounce<TArgs extends unknown[]>(fn: (...args: TArgs) => void, ms: number): (...args: TArgs) => void {
  let t: ReturnType<typeof setTimeout>;
  return (...args: TArgs) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const language = useStore((s) => s.language);
  const userRef = useRef<User | null>(null);
  const syncing = useRef(false);

  const doSave = useCallback(async (uid: string) => {
    if (syncing.current) return;
    const s = useStore.getState();
    try {
      await saveUserData(uid, {
        language: s.language,
        weightUnit: s.weightUnit,
        distanceUnit: s.distanceUnit,
        profile: s.profile,
        days: s.days,
        customExercises: s.customExercises,
        workoutHistory: s.workoutHistory,
      });
    } catch (e) {
      console.error("Error auto-syncing to Firestore:", e);
    }
  }, []);

  // Persist the debounced function across renders
  const debouncedSave = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    return debounce(doSave, 2000);
  }, [doSave]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      userRef.current = fbUser;

      if (fbUser) {
        // Si estamos en /login, redirigir inmediatamente para mejorar UX
        if (pathname === "/login") {
          router.replace("/");
        }

        // Sincronización en segundo plano para no bloquear el renderizado si la red es lenta
        syncing.current = true;
        try {
          const data = await loadUserData(fbUser.uid);
          if (data) {
            // Cloud data exists → load it into store
            useStore.getState().loadAllState({
              language: data.language as Language,
              weightUnit: data.weightUnit,
              distanceUnit: data.distanceUnit,
              profile: data.profile,
              days: data.days ?? [],
              customExercises: data.customExercises ?? [],
              workoutHistory: data.workoutHistory ?? [],
            });
          } else {
            // First login → migrate existing local data to cloud
            const s = useStore.getState();
            await saveUserData(fbUser.uid, {
              language: s.language,
              weightUnit: s.weightUnit,
              distanceUnit: s.distanceUnit,
              profile: s.profile,
              days: s.days,
              customExercises: s.customExercises,
              workoutHistory: s.workoutHistory,
            });
          }
        } catch (err) {
          console.error("Firestore sync error during login:", err);
        } finally {
          syncing.current = false;
        }
      } else {
        // Solo redirigir a login si no estamos ahí y no estamos cargando
        if (pathname !== "/login" && pathname !== "/signup") {
          router.replace("/login");
        }
      }
      setLoading(false);
    });

    return unsub;
  }, [pathname, router]);

  // Auto-sync store changes → Firestore
  useEffect(() => {
    const unsub = useStore.subscribe(() => {
      if (userRef.current && !syncing.current) {
        debouncedSave(userRef.current.uid);
      }
    });
    return unsub;
  }, [debouncedSave]);

  const signInWithGoogle = async () => {
    // Popup es más estable que Redirect para desarrollo local y Next.js
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error(e); }
  };

  const signInWithEmail = async (e: string, p: string) => {
    return await signInWithEmailAndPassword(auth, e, p);
  };

  const signUpWithEmail = async (e: string, p: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, e, p);
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);
    }
    return userCredential;
  };

  const logout = async () => {
    await signOut(auth);
    useStore.getState().loadAllState({
      profile: null,
      days: [],
      customExercises: [],
      workoutHistory: [],
      language: "es",
      weightUnit: "kg",
      distanceUnit: "km",
    });
    router.replace("/login");
  };

  if (loading || (!user && pathname !== "/login" && pathname !== "/signup")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-10 h-10 text-emerald-500 animate-pulse" />
          <p className="text-zinc-400 text-sm">{language === "es" ? "Cargando LiftLab..." : "Loading LiftLab..."}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
