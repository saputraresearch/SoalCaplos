import Link from "next/link";
import { Sparkles, Upload, Play, BarChart, CheckCircle2, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold shadow-xs">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span>AI Vision OCR Powered Question Generator</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Turn Scanned PDF Exams into <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Interactive Quizizz Quizzes
          </span>
        </h1>
        
        <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Upload any scanned PDF test sheet. Our Gemini Flash Vision pipeline transcribes questions, extracts diagram figures, and generates an engaging, asynchronous quiz experience for your students.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/admin/create"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            <span>Upload PDF & Create Quiz</span>
          </Link>
          <Link
            href="/admin/quizzes"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold shadow-xs hover:bg-slate-50 transition flex items-center justify-center gap-2"
          >
            <BarChart className="w-5 h-5 text-slate-500" />
            <span>View Quiz Dashboard</span>
          </Link>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Gemini Flash Vision OCR</h3>
          <p className="text-sm text-slate-600">
            Strict transcription mode extracts text, multiple-choice options, answer keys, and crops diagram images directly from scanned PDF pages.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Play className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Quizizz-Style Student Experience</h3>
          <p className="text-sm text-slate-600">
            One question at a time runner with progress bar, instant color-coded feedback, chime sound effects, and detailed explanation reveals.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Persistent Analytics & CSV Export</h3>
          <p className="text-sm text-slate-600">
            All quizzes and student submissions stored persistently in Supabase PostgreSQL. Teachers can track scores and export grades to CSV.
          </p>
        </div>
      </section>
    </div>
  );
}
