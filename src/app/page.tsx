"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  BarChart3, 
  FileText, 
  Sparkles, 
  Layers, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  Edit,
  Clock,
  HelpCircle,
  Image as ImageIcon
} from "lucide-react";
import { Quiz } from "@/lib/types";

export default function Home() {
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const res = await fetch("/api/quizzes");
        const data = await res.json();
        if (data?.quizzes && Array.isArray(data.quizzes)) {
          setRecentQuizzes(data.quizzes.slice(0, 3));
        }
      } catch {
        // Fallback gracefully on error
      } finally {
        setLoadingQuizzes(false);
      }
    }
    loadQuizzes();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-3 sm:py-6">
      {/* 1. COMPACT HERO SECTION */}
      <section className="text-center space-y-4 pt-1 sm:pt-3">
        {/* Brand Anchor Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-caplos-blue-50 border border-caplos-blue-200/80 text-xs font-semibold text-caplos-navy shadow-2xs">
          <img
            src="/logo.png"
            alt="Caplos"
            className="w-5 h-5 rounded-full object-cover border border-caplos-blue-300"
          />
          <span className="font-bold text-caplos-blue">CAPLOS</span>
          <span className="text-slate-300">•</span>
          <span className="text-caplos-navy-600 font-medium hidden sm:inline">
            Create, Analyze & Personalize Learning Questions
          </span>
        </div>

        {/* Product-Oriented Headline */}
        <div className="space-y-2 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-caplos-navy tracking-tight leading-tight">
            Turn Learning Materials into{" "}
            <span className="text-caplos-blue">Interactive Quizzes</span>
          </h1>
          <p className="text-sm sm:text-base text-caplos-navy-600 leading-relaxed font-normal max-w-xl mx-auto">
            Upload your material, let AI create the questions, and personalize them for your students.
          </p>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/admin/create"
            className="px-6 py-3 rounded-xl bg-caplos-blue hover:bg-caplos-blue-600 text-white font-bold text-sm shadow-xs hover:shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-caplos-yellow" />
            <span>+ Buat Quiz Baru</span>
          </Link>

          <Link
            href="/admin/quizzes"
            className="px-5 py-3 rounded-xl bg-white border border-slate-300 text-caplos-navy hover:bg-slate-50 font-semibold text-sm shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-caplos-blue" />
            <span>Dashboard</span>
          </Link>
        </div>
      </section>

      {/* 2. PRODUCT PREVIEW SECTION: WORKFLOW DEMONSTRATION */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Preview Header */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-caplos-navy-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-caplos-blue animate-pulse" />
            <span className="font-bold text-caplos-navy">Alur Kerja Caplos: Dokumen ➔ AI ➔ Kuis Interaktif</span>
          </div>
          <span className="text-[11px] text-slate-500">Pratinjau Otomatisasi Soal</span>
        </div>

        {/* Interactive-looking Workflow Body */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Material Input & Detection */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-caplos-navy truncate">
                    Asesmen_Matematika_Kelas_4.pdf
                  </h4>
                  <p className="text-[11px] text-slate-500">12 halaman • 2.4 MB</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-xs text-caplos-navy-700">
                <span className="text-[11px] font-bold text-caplos-navy uppercase tracking-wider block mb-1">
                  Hasil Deteksi AI:
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>20 Butir Soal Teridentifikasi</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Diagram Gambar Dipotong Otomatis</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Pilihan Ganda, Isian, & Soal Cerita</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-caplos-navy-500 italic">
              *AI membaca naskah, memotong koordinat diagram, dan menyusun kunci jawaban.
            </p>
          </div>

          {/* Flow Connector (Desktop) */}
          <div className="hidden lg:flex lg:col-span-1 justify-center">
            <div className="w-8 h-8 rounded-full bg-caplos-blue-50 text-caplos-blue border border-caplos-blue-200 flex items-center justify-center shadow-2xs">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Right Column: Generated Interactive Question Card */}
          <div className="lg:col-span-6">
            <div className="p-4 sm:p-5 rounded-xl border border-caplos-blue-200 bg-white shadow-2xs space-y-3">
              {/* Question Badge Header */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-caplos-blue bg-caplos-blue-50 px-2.5 py-0.5 rounded-full border border-caplos-blue-200">
                  Soal #1 • Pilihan Ganda
                </span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Kunci Terdeteksi
                </span>
              </div>

              {/* Question Text */}
              <p className="text-xs sm:text-sm font-semibold text-caplos-navy leading-relaxed">
                Perhatikan gambar jaring-jaring balok di bawah ini. Sisi yang berhadapan dengan sisi bernomor (2) adalah sisi bernomor ...
              </p>

              {/* Simulated Diagram Thumbnail */}
              <div className="h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-500 gap-1.5">
                <ImageIcon className="w-4 h-4 text-caplos-blue" />
                <span className="text-[11px] font-medium">[ Diagram Jaring-Jaring Balok ]</span>
              </div>

              {/* Interactive Options Preview */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                  <span className="font-bold text-caplos-navy mr-1.5">A.</span> Nomor (4)
                </div>
                <div className="p-2 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 text-xs font-bold text-emerald-900 flex items-center justify-between">
                  <span><span className="mr-1.5">B.</span> Nomor (5)</span>
                  <span className="text-[10px] text-emerald-700 font-black">✓ KUNCI</span>
                </div>
                <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                  <span className="font-bold text-caplos-navy mr-1.5">C.</span> Nomor (1)
                </div>
                <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                  <span className="font-bold text-caplos-navy mr-1.5">D.</span> Nomor (6)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Footer CTA */}
        <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs">
          <span className="text-caplos-navy-600 font-medium">
            Mulai dari file PDF Anda atau tulis manual sesuai kebutuhan.
          </span>
          <Link
            href="/admin/create"
            className="font-bold text-caplos-blue hover:text-caplos-blue-700 flex items-center gap-1 transition"
          >
            <span>Buat Kuis Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 3. CORE CAPABILITIES (4 COMPACT CARDS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-caplos-navy uppercase tracking-wider">
            Fitur & Kapabilitas
          </h3>
          <span className="text-xs text-slate-500">Dirancang Khusus untuk Pembelajaran</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: PDF to Quiz */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-caplos-blue/40 transition">
            <div className="w-8 h-8 rounded-xl bg-caplos-blue-50 text-caplos-blue flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-caplos-navy">PDF ➔ Quiz Otomatis</h4>
            <p className="text-xs text-caplos-navy-600 leading-relaxed font-normal">
              Ubah lembar ujian fisik atau naskah PDF menjadi latihan interaktif lengkap dengan pemotongan gambar diagram.
            </p>
          </div>

          {/* Card 2: AI Question Generation */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-caplos-blue/40 transition">
            <div className="w-8 h-8 rounded-xl bg-caplos-yellow/20 text-caplos-navy-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-caplos-yellow-700" />
            </div>
            <h4 className="text-xs font-bold text-caplos-navy">Pembangkit Soal AI</h4>
            <p className="text-xs text-caplos-navy-600 leading-relaxed font-normal">
              Buat variasi soal baru dan pilihan pengecoh berjenjang sesuai materi pembelajaran siswa.
            </p>
          </div>

          {/* Card 3: 11 Interactive Question Types */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-caplos-blue/40 transition">
            <div className="w-8 h-8 rounded-xl bg-caplos-blue-50 text-caplos-blue flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-caplos-navy">11 Tipe Soal Gamifikasi</h4>
            <p className="text-xs text-caplos-navy-600 leading-relaxed font-normal">
              Mendukung pilihan ganda kompleks, menjodohkan 1-to-1, urutan kronologis, isian rumpang, hingga hotspot gambar.
            </p>
          </div>

          {/* Card 4: Child-Friendly Format */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-caplos-blue/40 transition">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-caplos-navy">Format Ramah Anak SD</h4>
            <p className="text-xs text-caplos-navy-600 leading-relaxed font-normal">
              Pemisahan wacana cerita panjang ke kartu bacaan berjarak lapang sehingga siswa tidak cepat lelah membaca.
            </p>
          </div>
        </div>
      </section>

      {/* 4. RECENT QUIZZES / WORKSPACE AREA */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-caplos-blue" />
            <h3 className="text-sm font-bold text-caplos-navy uppercase tracking-wider">
              Kuis Saya (Recent Quizzes)
            </h3>
          </div>
          <Link
            href="/admin/quizzes"
            className="text-xs font-semibold text-caplos-blue hover:text-caplos-blue-700 transition"
          >
            Lihat Semua Kuis ➔
          </Link>
        </div>

        {loadingQuizzes ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-2.5">
                <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : recentQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-caplos-blue/50 hover:shadow-xs transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="text-slate-400">
                      {new Date(quiz.created_at).toLocaleDateString("id-ID")}
                    </span>
                    {quiz.status === "draft" ? (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                        Draft
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px]">
                        Published
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-caplos-navy leading-snug line-clamp-2">
                    {quiz.title}
                  </h4>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href={`/admin/quizzes/${quiz.id}/edit`}
                    className="text-slate-600 hover:text-caplos-blue font-medium flex items-center gap-1 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>

                  <Link
                    href={`/quiz/${quiz.slug}`}
                    target="_blank"
                    className="font-bold text-caplos-blue hover:text-caplos-blue-700 flex items-center gap-1 transition"
                  >
                    <span>Kerjakan</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tasteful Empty State */
          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-2.5">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-caplos-navy">Belum ada kuis yang dibuat</h4>
              <p className="text-xs text-slate-500">
                Unggah naskah soal pertama Anda atau buat pertanyaan secara manual.
              </p>
            </div>
            <div className="pt-1">
              <Link
                href="/admin/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-caplos-blue text-white font-bold text-xs shadow-2xs hover:bg-caplos-blue-600 transition"
              >
                <Plus className="w-3.5 h-3.5 text-caplos-yellow" />
                <span>+ Buat Kuis Pertama Anda</span>
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
