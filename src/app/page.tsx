import Link from "next/link";
import { Upload, BarChart3, Play, Sparkles, Layers, BookOpen, Database } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-2 text-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Mascot Logo Avatar */}
        <div className="relative inline-block group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-md border-2 border-caplos-blue bg-white flex items-center justify-center mx-auto transition-transform group-hover:scale-105 duration-300">
            <img
              src="/logo.png"
              alt="Caplos Mascot"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-caplos-yellow text-caplos-navy font-black text-[10px] shadow-xs border border-white">
            AI
          </span>
        </div>

        {/* Brand & Highlighted Tagline */}
        <div className="space-y-2">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-caplos-blue select-none">
            C<span className="text-caplos-yellow">A</span>PLOS
          </h1>
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-black text-caplos-navy tracking-tight">
              Create, Analyze & Personalize
            </h2>
            <p className="text-lg sm:text-xl font-extrabold text-caplos-blue">
              Learning Questions
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/admin/create"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-caplos-blue text-white font-bold shadow-md shadow-caplos-blue/20 hover:bg-caplos-blue-600 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Upload className="w-4 h-4 text-caplos-yellow" />
            <span>Buat Kuis Baru</span>
          </Link>

          <Link
            href="/admin/quizzes"
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white border-2 border-caplos-navy text-caplos-navy font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <BarChart3 className="w-4 h-4 text-caplos-blue" />
            <span>Dashboard Kuis</span>
          </Link>

          <Link
            href="/quiz/demo"
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-caplos-blue-50 text-caplos-blue font-bold hover:bg-caplos-blue-100 transition flex items-center justify-center gap-2 cursor-pointer text-sm border border-caplos-blue-200/60"
          >
            <Play className="w-4 h-4 text-caplos-blue" />
            <span>Kuis Demo</span>
          </Link>
        </div>

        {/* Minimalist Feature Chips (Fitur Andalan Ringkas & Bersih) */}
        <div className="pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-caplos-navy-600">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-caplos-yellow-600" />
            <span>PDF Vision OCR</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-caplos-blue" />
            <span>11 Tipe Soal Interaktif</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format Ramah Anak SD</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-caplos-navy" />
            <span>Cloud Supabase 24/7</span>
          </span>
        </div>
      </div>
    </div>
  );
}
