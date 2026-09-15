import Link from "next/link";
import { Plus, BarChart3, Play, FileText, Sparkles, Layers, Smile } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-10.5rem)] py-2 sm:py-4 text-center max-w-4xl mx-auto">
      {/* Top Spacer for balance */}
      <div className="hidden sm:block" />

      {/* Main Highlight: Logo, CAPLOS, and Tagline */}
      <div className="space-y-4 my-auto w-full">
        {/* Logo Mascot */}
        <div className="relative inline-block">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-md border-2 border-caplos-blue bg-white flex items-center justify-center mx-auto transition-transform hover:scale-105 duration-300">
            <img
              src="/logo.png"
              alt="Caplos Mascot"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-caplos-blue select-none">
          C<span className="text-caplos-yellow">A</span>PLOS
        </h1>

        {/* Tagline Highlight (The Star Headline) */}
        <div className="max-w-2xl mx-auto px-2">
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-caplos-navy tracking-tight leading-snug">
            Create, Analyze & Personalize <br className="hidden sm:inline" />
            <span className="text-caplos-blue">Learning Questions</span>
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <Link
            href="/admin/create"
            className="px-6 py-3.5 rounded-xl bg-caplos-blue hover:bg-caplos-blue-600 text-white font-bold text-sm shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-caplos-yellow" />
            <span>+ Buat Quiz Baru</span>
          </Link>

          <Link
            href="/admin/quizzes"
            className="px-5 py-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-caplos-navy font-bold text-sm shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-caplos-blue" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/quiz/demo"
            className="px-4 py-3.5 rounded-xl bg-caplos-blue-50 hover:bg-caplos-blue-100 text-caplos-blue font-bold text-sm border border-caplos-blue-200 transition flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Coba Demo</span>
          </Link>
        </div>
      </div>

      {/* Feature Highlights (Compact, Zero Scroll, Clean & Simple) */}
      <div className="w-full pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
          {/* Feature 1 */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1 hover:border-caplos-blue/40 transition">
            <div className="w-7 h-7 rounded-lg bg-caplos-blue-50 text-caplos-blue flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-caplos-navy">PDF ➔ Kuis</h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Ekstrak teks & potong diagram otomatis.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1 hover:border-caplos-blue/40 transition">
            <div className="w-7 h-7 rounded-lg bg-caplos-yellow/20 text-caplos-navy-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-caplos-yellow-700" />
            </div>
            <h3 className="text-xs font-bold text-caplos-navy">AI Question Generator</h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Bikin soal & pengecoh cerdas berjenjang.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1 hover:border-caplos-blue/40 transition">
            <div className="w-7 h-7 rounded-lg bg-caplos-blue-50 text-caplos-blue flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-caplos-navy">11 Tipe Interaktif</h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Pilihan ganda, jodohkan, urutan, isian.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1 hover:border-caplos-blue/40 transition">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Smile className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-caplos-navy">Ramah Anak SD</h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Format cerita terpisah & nyaman dibaca.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
