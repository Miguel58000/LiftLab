"use client";

import * as React from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Activity, LogOut, Dumbbell, LayoutDashboard, Play } from "lucide-react";
import { useStore } from "@/store/useStore";
import { translations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

function SettingsModal({ trigger }: { trigger: React.ReactElement }) {
  const {
    language, setLanguage,
    weightUnit, setWeightUnit,
    distanceUnit, setDistanceUnit,
  } = useStore();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = translations[language];

  React.useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    // Si el tema está en 'system' (por defecto o rastro viejo), lo normalizamos 
    // para que coincida con una de las opciones disponibles (light/dark).
    if (theme === 'system' && resolvedTheme) {
      setTheme(resolvedTheme);
    }
    return () => window.clearTimeout(timer);
  }, [theme, resolvedTheme, setTheme]);

  if (!mounted) return trigger;

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle>{t.settings_title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <Label>{t.settings_language}</Label>
            <Select value={language} onValueChange={(v) => v && setLanguage(v as 'en' | 'es')}>
              <SelectTrigger>
                <SelectValue>
                  {language === 'es' ? t.settings_lang_es : t.settings_lang_en}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t.settings_lang_en}</SelectItem>
                <SelectItem value="es">{t.settings_lang_es}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t.settings_theme}</Label>
            {(() => {
              const currentTheme = theme === 'system' ? (resolvedTheme || 'dark') : (theme || 'dark');
              const themeLabel = currentTheme === 'dark' ? t.settings_theme_dark : t.settings_theme_light;
              return (
                <Select
                  value={currentTheme}
                  onValueChange={(v) => v && setTheme(v)}
                >
                  <SelectTrigger>
                    <SelectValue>{themeLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t.settings_theme_light}</SelectItem>
                    <SelectItem value="dark">{t.settings_theme_dark}</SelectItem>
                  </SelectContent>
                </Select>
              );
            })()}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t.settings_unit_weight}</Label>
            <Select value={weightUnit} onValueChange={(v) => v && setWeightUnit(v as 'kg' | 'lbs')}>
              <SelectTrigger>
                <SelectValue>
                  {weightUnit === 'kg' ? t.settings_unit_weight_kg : t.settings_unit_weight_lbs}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">{t.settings_unit_weight_kg}</SelectItem>
                <SelectItem value="lbs">{t.settings_unit_weight_lbs}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t.settings_unit_distance}</Label>
            <Select value={distanceUnit} onValueChange={(v) => v && setDistanceUnit(v as 'km' | 'mi')}>
              <SelectTrigger>
                <SelectValue>
                  {distanceUnit === 'km' ? t.settings_unit_distance_km : t.settings_unit_distance_mi}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">{t.settings_unit_distance_km}</SelectItem>
                <SelectItem value="mi">{t.settings_unit_distance_mi}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Navbar() {
  const { language } = useStore();
  const { user, logout } = useAuth();
  const t = translations[language];

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-zinc-900 dark:text-primary font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
          <Activity className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          <span className="dark:text-white">Lift<span className="text-zinc-500 dark:text-zinc-400">Lab</span></span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <div className="hidden md:flex items-center gap-6">
            <Link href="/builder" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">{t.nav_builder}</Link>
            <Link href="/tracker" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">{t.nav_tracker}</Link>
            <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">{t.nav_dashboard}</Link>
          </div>

          <div className="flex items-center gap-2 md:border-l border-zinc-200 dark:border-zinc-800 md:pl-6 ml-2">
            <SettingsModal
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
                  <Settings className="w-4 h-4" />
                </Button>
              }
            />
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                {user.photoURL && (
                  <Image src={user.photoURL} alt={user.displayName ?? "User"} width={28} height={28} className="rounded-full" referrerPolicy="no-referrer" />
                )}
                <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-zinc-500 hover:text-red-500" title={t.logout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { language } = useStore();
  const t = translations[language];

  if (pathname === "/login") return null;

  const links = [
    { href: "/builder", label: t.nav_builder, icon: Dumbbell },
    { href: "/tracker", label: t.nav_tracker, icon: Play },
    { href: "/dashboard", label: t.nav_dashboard, icon: LayoutDashboard },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800/50 transition-colors shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-16 px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive
                  ? "text-emerald-500 dark:text-emerald-400 scale-105"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Footer() {
  const pathname = usePathname();
  const { language } = useStore();
  const isLogin = pathname === "/login";
  if (isLogin) return null;

  const footerText = language === "es"
    ? "Desarrollado por Miguel Rodríguez - 2026 - v1.6.0 - Todos los derechos reservados"
    : "Developed by Miguel Rodríguez - 2026 - v1.6.0 - All rights reserved";

  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 py-6 text-center transition-colors">
      <div className="container mx-auto px-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {footerText}
        </p>
      </div>
    </footer>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  return (
    <>
      {!isLogin && <Navbar />}
      <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
      {!isLogin && <Footer />}
      {!isLogin && <BottomNav />}
    </>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><title>LiftLab</title></head>
      <body className={`${inter.className} bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 antialiased min-h-screen flex flex-col transition-colors`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
