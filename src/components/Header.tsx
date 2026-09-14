"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, FileText, BarChart3, Settings } from "lucide-react";
import SettingsModal from "./SettingsModal";

export default function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 hover:opacity-90 transition">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              QuizCaplos
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link 
              href="/admin/create" 
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Create Quiz</span>
            </Link>
            <Link 
              href="/admin/quizzes" 
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              title="Gemini API Key Settings"
            >
              <Settings className="w-4 h-4 text-indigo-600" />
              <span>API Key</span>
            </button>
          </nav>
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
