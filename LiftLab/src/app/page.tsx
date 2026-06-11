"use client";

import Link from "next/link";
import { ArrowRight, Activity, Zap, BarChart3, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { translations } from "@/lib/i18n";

export default function Home() {
  const { language, days = [] } = useStore();
  const t = translations[language];

  return (
    <div className="flex-1 flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-100 via-zinc-50 to-zinc-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 transition-colors">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-8 border border-emerald-500/20">
          <Zap className="w-4 h-4" />
          <span>{t.hero_badge}</span>
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl mb-6 text-zinc-900 dark:text-zinc-50">
          {t.hero_title_1} <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-500 to-emerald-700 dark:from-emerald-400 dark:to-emerald-600">{t.hero_title_2}</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          {t.hero_subtitle}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/builder">
            <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-semibold h-12 px-8 rounded-full">
              {days.length > 0 
                ? (language === 'es' ? 'Ver mi rutina' : 'View my routine')
                : t.btn_build_split}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
              {t.btn_view_analytics}
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-24 bg-white dark:bg-zinc-950 px-4 transition-colors">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard 
              icon={<Activity className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />}
              title={t.feat_vol_title}
              description={t.feat_vol_desc}
            />
            <FeatureCard 
              icon={<Target className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />}
              title={t.feat_bal_title}
              description={t.feat_bal_desc}
            />
            <FeatureCard 
              icon={<BarChart3 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />}
              title={t.feat_ins_title}
              description={t.feat_ins_desc}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}
