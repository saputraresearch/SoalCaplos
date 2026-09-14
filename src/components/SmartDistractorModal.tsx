"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { GeneratedOption, DistractorResponse } from "@/app/api/generate-distractors/route";

interface SmartDistractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestionText: string;
  initialCorrectAnswer?: string;
  currentOptionCount?: number;
  onApply: (options: string[], correctIndex: number) => void;
}

export default function SmartDistractorModal({
  isOpen,
  onClose,
  initialQuestionText,
  initialCorrectAnswer = "",
  currentOptionCount = 4,
  onApply,
}: SmartDistractorModalProps) {
  const [questionText, setQuestionText] = useState(initialQuestionText);
  const [correctAnswer, setCorrectAnswer] = useState(initialCorrectAnswer);
  const [optionCount, setOptionCount] = useState(Math.min(Math.max(currentOptionCount, 2), 6));
  const [targetGrade, setTargetGrade] = useState("SMP (12-15 tahun)");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedOptions, setGeneratedOptions] = useState<GeneratedOption[] | null>(null);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setQuestionText(initialQuestionText);
      setCorrectAnswer(initialCorrectAnswer);
      setOptionCount(Math.min(Math.max(currentOptionCount, 2), 6));
      setErrorMsg(null);
      setGeneratedOptions(null);
    }
  }, [isOpen, initialQuestionText, initialCorrectAnswer, currentOptionCount]);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!questionText.trim()) {
      setErrorMsg("Teks pertanyaan kuis wajib diisi.");
      return;
    }

    if (!correctAnswer.trim()) {
      setErrorMsg("Kunci jawaban benar wajib diisi untuk membuat pengecoh logis.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const apiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("quizcaplos_gemini_api_key")
          : null;
      const model =
        typeof window !== "undefined"
          ? localStorage.getItem("quizcaplos_gemini_model")
          : null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["x-gemini-api-key"] = apiKey;
      if (model) headers["x-gemini-model"] = model;

      const res = await fetch("/api/generate-distractors", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question_text: questionText.trim(),
          correct_answer: correctAnswer.trim(),
          option_count: optionCount,
          target_age: targetGrade,
        }),
      });

      const data: DistractorResponse & { error?: string } = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Gagal membuat pengecoh otomatis.");
      }

      if (Array.isArray(data.generated_options)) {
        setGeneratedOptions(data.generated_options);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses AI.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedOptions || generatedOptions.length === 0) return;

    const options = generatedOptions.map((o) => o.option_text);
    const correctIdx = generatedOptions.findIndex((o) => o.is_correct);

    onApply(options, correctIdx >= 0 ? correctIdx : 0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-pop border border-slate-100 my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Smart Options & Distractor Generator</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  AI Core Engine
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Buat opsi pengecoh logis berdasarkan miskonsepsi umum siswa dan struktur kalimat paralel.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Input Section */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teks Soal / Pertanyaan Utama:
              </label>
              <textarea
                rows={2}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Contoh: Apa organ utama yang memompa darah ke seluruh tubuh?"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kunci Jawaban Benar (Target):
                </label>
                <input
                  type="text"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="Contoh: Jantung"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-emerald-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Pilihan (2 - 6):
                </label>
                <select
                  value={optionCount}
                  onChange={(e) => setOptionCount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value={2}>2 Pilihan (A - B)</option>
                  <option value={3}>3 Pilihan (A - C)</option>
                  <option value={4}>4 Pilihan (A - D, Default)</option>
                  <option value={5}>5 Pilihan (A - E)</option>
                  <option value={6}>6 Pilihan (A - F)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Jenjang:
                </label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="SD (7-12 tahun)">SD (7-12 thn)</option>
                  <option value="SMP (12-15 tahun)">SMP (12-15 thn)</option>
                  <option value="SMA/SMK (15-18 tahun)">SMA/SMK (15-18 thn)</option>
                  <option value="Perguruan Tinggi / Umum">Kuliah / Umum</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleGenerate()}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? "Sedang Menganalisis & Membuat Pengecoh..." : "✨ Buat Opsi Pengecoh Otomatis"}</span>
            </button>
          </div>

          {/* Generated Result Preview */}
          {generatedOptions && generatedOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Hasil Opsi & Analisis Edukasi</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Posisi Kunci Diacak
                </span>
              </div>

              <div className="space-y-2.5">
                {generatedOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition ${
                      opt.is_correct
                        ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center uppercase shrink-0 ${
                            opt.is_correct
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {opt.option_letter}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {opt.option_text}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          opt.is_correct
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {opt.is_correct ? "Kunci Benar" : "Pengecoh Logis"}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] font-medium text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                      <span className="font-bold text-slate-700 shrink-0">Analisis:</span>
                      <span className="leading-relaxed">{opt.distractor_analysis}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!generatedOptions || generatedOptions.length === 0}
            onClick={handleApply}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 transition"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan ke Soal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
