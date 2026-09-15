import Link from "next/link";
import { Sparkles, Upload, Play, BarChart3, CheckCircle2, Zap, BrainCircuit, BookOpen, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-16 py-6 sm:py-10">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white via-caplos-blue-50/40 to-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-caplos-blue-50 border border-caplos-blue-200 text-caplos-blue text-xs font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-caplos-yellow-600" />
              <span>Platform Asesmen & Kuis Pembelajaran AI</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-caplos-blue flex items-center justify-center lg:justify-start gap-0.5 select-none">
                <span>C</span>
                <span className="text-caplos-yellow">A</span>
                <span>PLOS</span>
              </h1>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-caplos-navy tracking-tight leading-tight">
                  Create, Analyze & Personalize
                </h2>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-caplos-blue tracking-tight">
                  Learning Questions
                </p>
              </div>
            </div>

            <p className="text-base text-caplos-navy-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
              Platform cerdas untuk pendidik dan siswa: membuat kuis otomatis dari dokumen PDF, 
              menganalisis hasil belajar, serta menghadirkan asesmen interaktif yang dipersonalisasi secara menyenangkan.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                href="/admin/create"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-caplos-blue text-white font-bold shadow-lg shadow-caplos-blue/30 hover:bg-caplos-blue-600 hover:shadow-xl transition flex items-center justify-center gap-2.5 text-base cursor-pointer"
              >
                <Upload className="w-5 h-5 text-caplos-yellow" />
                <span>Unggah PDF & Buat Soal</span>
              </Link>

              <Link
                href="/quiz/demo"
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white border-2 border-caplos-navy text-caplos-navy font-bold shadow-xs hover:bg-caplos-yellow/10 transition flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <Play className="w-5 h-5 text-caplos-blue" />
                <span>Coba Demo Siswa</span>
              </Link>
            </div>

            {/* Micro highlights */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-caplos-navy-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Auto-Potong Diagram PDF
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-caplos-yellow-700" /> 11 Tipe Soal Interaktif
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-caplos-blue" /> Ramah Siswa SD
              </span>
            </div>
          </div>

          {/* Right Column: Mascot Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative group">
              {/* Outer decorative ring */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-caplos-blue via-caplos-yellow to-caplos-navy rounded-3xl opacity-30 blur-md group-hover:opacity-50 transition duration-500" />
              
              <div className="relative bg-white p-4 sm:p-5 rounded-3xl border-2 border-caplos-blue-100 shadow-xl max-w-sm flex flex-col items-center text-center space-y-4">
                <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-gradient-to-b from-caplos-blue-50 to-white flex items-center justify-center border border-caplos-yellow/40 shadow-inner">
                  <img
                    src="/logo.png"
                    alt="Caplos Mascot"
                    className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-caplos-yellow text-caplos-navy font-black text-xs">
                    ⭐ BELAJAR JADI ASYIK
                  </div>
                  <h3 className="font-black text-lg text-caplos-navy">Halo, Aku Caplos!</h3>
                  <p className="text-xs text-caplos-navy-600 font-medium">
                    Siap membantu Guru membuat soal berkualitas dan mendampingi Siswa belajar dengan ceria!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-caplos-blue bg-caplos-blue-50 px-3 py-1 rounded-full">
            Fitur Unggulan
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-caplos-navy">
            Mengapa Memilih Caplos untuk Sekolah Anda?
          </h2>
          <p className="text-sm text-caplos-navy-600">
            Didesain khusus untuk menyatukan kemudahan kerja guru dengan antusiasme belajar siswa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Multimodal PDF Vision */}
          <div className="bg-white p-7 rounded-3xl border-2 border-caplos-blue/20 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-caplos-blue text-white flex items-center justify-center shadow-md shadow-caplos-blue/20">
                <Zap className="w-6 h-6 text-caplos-yellow" />
              </div>
              <h3 className="text-xl font-bold text-caplos-navy">
                Ekstraksi PDF Multimodal Cerdas
              </h3>
              <p className="text-sm text-caplos-navy-600 leading-relaxed">
                Bukan cuma teks! Diagram soal dan pilihan jawaban bergambar otomatis dipotong dengan presisi dari file PDF Anda tanpa perlu screenshot manual.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-caplos-blue">
              <span>Didukung Gemini Flash Vision</span>
            </div>
          </div>

          {/* Pillar 2: 11 Interactive Question Types */}
          <div className="bg-white p-7 rounded-3xl border-2 border-caplos-yellow/40 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-caplos-yellow text-caplos-navy flex items-center justify-center shadow-md shadow-caplos-yellow/20">
                <Layers className="w-6 h-6 text-caplos-navy" />
              </div>
              <h3 className="text-xl font-bold text-caplos-navy">
                11 Tipe Soal Gamifikasi Interaktif
              </h3>
              <p className="text-sm text-caplos-navy-600 leading-relaxed">
                Menjodohkan Drag & Drop 1-to-1, Urutan Tap-to-Swap anak SD, Isian Rumpang multi-blank, hingga Hotspot gambar interaktif yang anti-bosan.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-caplos-yellow-700">
              <span>Siswa Lebih Antusias Mengerjakan</span>
            </div>
          </div>

          {/* Pillar 3: Kid-Friendly Typography & Analytics */}
          <div className="bg-white p-7 rounded-3xl border-2 border-caplos-navy/20 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-caplos-navy text-white flex items-center justify-center shadow-md shadow-caplos-navy/20">
                <BookOpen className="w-6 h-6 text-caplos-yellow" />
              </div>
              <h3 className="text-xl font-bold text-caplos-navy">
                Tipografi Ramah Anak SD & Analitik
              </h3>
              <p className="text-sm text-caplos-navy-600 leading-relaxed">
                Teks wacana cerita panjang otomatis ditata dalam kartu bacaan hangat lapang. Nilai dan rekap jawaban siswa tersimpan rapi dan aman.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-caplos-navy">
              <span>Bebas Tembok Teks Melelahkan</span>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="bg-caplos-navy rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-caplos-yellow text-caplos-navy font-extrabold text-xs">
            ✨ SIAP DALAM 1 MENIT
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Mulai Buat Kuis Interaktif Pertama Anda
          </h2>
          <p className="text-caplos-navy-200 text-sm sm:text-base leading-relaxed">
            Tinggalkan cara lama yang memakan waktu. Manfaatkan kecerdasan AI Caplos untuk asesmen pembelajaran yang lebih personal dan bermakna.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/admin/create"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-caplos-yellow text-caplos-navy font-black shadow-lg hover:bg-caplos-yellow-600 transition flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              <Upload className="w-5 h-5 text-caplos-navy" />
              <span>Buat Soal Sekarang</span>
            </Link>
            <Link
              href="/admin/quizzes"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              <BarChart3 className="w-5 h-5 text-caplos-yellow" />
              <span>Lihat Kuis Saya</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
