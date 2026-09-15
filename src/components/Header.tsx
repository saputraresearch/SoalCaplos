"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, FileText, BarChart3, Settings } from "lucide-react";
import SettingsModal from "./SettingsModal";

export default function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border-2 border-caplos-blue bg-white flex items-center justify-center transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="Caplos Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-2xl tracking-tight text-caplos-blue">
                  C<span className="text-caplos-yellow">A</span>PLOS
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-caplos-yellow/20 text-caplos-navy-800 border border-caplos-yellow/50">
                  AI Quiz
                </span>
              </div>
              <span className="text-[10px] text-caplos-navy-500 font-semibold tracking-wide hidden sm:block">
                Create, Analyze & Personalize
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link 
              href="/admin/create" 
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-white bg-caplos-blue hover:bg-caplos-blue-600 transition shadow-xs hover:shadow-md"
            >
              <FileText className="w-4 h-4 text-caplos-yellow" />
              <span className="hidden sm:inline">Buat Soal</span>
            </Link>
            <Link 
              href="/admin/quizzes" 
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-caplos-navy hover:bg-caplos-blue-50 hover:text-caplos-blue transition border border-slate-200/80 bg-white"
            >
              <BarChart3 className="w-4 h-4 text-caplos-blue" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-caplos-navy hover:bg-slate-200 transition border border-slate-200 cursor-pointer"
              title="Pengaturan Google Gemini API Key"
            >
              <Settings className="w-4 h-4 text-caplos-blue" />
              <span className="hidden md:inline">API Key</span>
            </button>
          </nav>
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
