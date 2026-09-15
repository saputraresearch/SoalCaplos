"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, CheckSquare } from "lucide-react";
import { ParsedQuestion, QuestionType } from "@/lib/types";
import { safeParseResponseJson } from "@/lib/apiResponse";

interface AiGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (questions: ParsedQuestion[], title?: string) => void;
}

const QUESTION_TYPE_OPTIONS: { type: QuestionType; label: string; desc: string }[] = [
  { type: "MULTIPLE_CHOICE", label: "Multiple Choice", desc: "4 opsi (A-D), 1 kunci benar" },
  { type: "MULTIPLE_SELECT", label: "Multiple Select", desc: "5 opsi (A-E), 2-4 kunci benar" },
  { type: "TRUE_OR_FALSE", label: "True / False", desc: "Pernyataan Benar / Salah" },
  { type: "MATCHING", label: "Matching", desc: "Menjodohkan Kolom Kiri & Kanan" },
  { type: "REORDER", label: "Reorder", desc: "Urutan proses/kronologis acak" },
  { type: "FILL_IN_THE_BLANKS", label: "Fill in Blanks", desc: "Teks rumpang dengan [___]" },
  { type: "OPEN_ENDED", label: "Open Ended (Essay)", desc: "Pertanyaan HOTS + Rubrik" },
  { type: "MATH_RESPONSE", label: "Math / STEM", desc: "Rumus, angka presisi, LaTeX" },
  { type: "IMAGE_LABELING", label: "Image Labeling", desc: "Label teks ke pin diagram gambar" },
  { type: "IMAGE_HOTSPOT", label: "Image Hotspot", desc: "Ketuk zona area target pada gambar" },
  { type: "CATEGORIZE_ITEMS", label: "Categorize Items", desc: "Pengelompokan kartu ke 2-3 kategori" },
];

export default function AiGenerateModal({ isOpen, onClose, onGenerated }: AiGenerateModalProps) {
  const [topic, setTopic] = useState("");
  const [targetAge, setTargetAge] = useState("12-15 tahun (SMP)");
  const [difficulty, setDifficulty] = useState("Sedang");
  const [count, setCount] = useState(8);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    "MULTIPLE_CHOICE",
    "MULTIPLE_SELECT",
    "TRUE_OR_FALSE",
    "MATCHING",
    "REORDER",
    "FILL_IN_THE_BLANKS",
    "OPEN_ENDED",
    "MATH_RESPONSE",
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) return; // Keep at least one
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const selectAll = () => {
    setSelectedTypes(QUESTION_TYPE_OPTIONS.map((o) => o.type));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMsg("Mata pelajaran atau topik kuis wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const apiKey = typeof window !== "undefined" ? localStorage.getItem("quizcaplos_gemini_api_key") : null;
      const model = typeof window !== "undefined" ? localStorage.getItem("quizcaplos_gemini_model") : null;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["x-gemini-api-key"] = apiKey;
      if (model) headers["x-gemini-model"] = model;

      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers,
        body: JSON.stringify({
          topic: topic.trim(),
          targetAge,
          difficulty,
          types: selectedTypes,
          count,
        }),
      });

      const parsedRes = await safeParseResponseJson(res);
      if (!parsedRes.ok || !parsedRes.data) {
        throw new Error(parsedRes.error || "Gagal membuat soal dengan AI.");
      }
      const data = parsedRes.data;

      onGenerated(data.questions || [], data.title);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses AI.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Buat Soal Otomatis dengan AI</h3>
            <p className="text-xs text-slate-500">
              Menghasilkan paket 8 tipe soal dengan pedagogi dan format standar.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Topik / Materi Kuis <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Hukum Newton, Fotosintesis, Aljabar Linear..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Target Usia Siswa
              </label>
              <select
                value={targetAge}
                onChange={(e) => setTargetAge(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="7-10 tahun (SD Awal)">7-10 tahun (SD Awal)</option>
                <option value="10-12 tahun (SD Akhir)">10-12 tahun (SD Akhir)</option>
                <option value="12-15 tahun (SMP)">12-15 tahun (SMP)</option>
                <option value="15-18 tahun (SMA/SMK)">15-18 tahun (SMA/SMK)</option>
                <option value="18+ tahun (Kuliah / Umum)">18+ tahun (Kuliah / Umum)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tingkat Kesulitan
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Mudah">Mudah (Dasar Pemahaman)</option>
                <option value="Sedang">Sedang (Aplikasi Konsep)</option>
                <option value="Sulit / HOTS">Sulit (Analisis & Evaluasi / HOTS)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Pilih Tipe Soal ({selectedTypes.length}/8 Terpilih)
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                Pilih Semua (8 Tipe)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {QUESTION_TYPE_OPTIONS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => toggleType(item.type)}
                  className={`p-2 rounded-lg text-left text-xs border transition flex items-center gap-2 ${
                    selectedTypes.includes(item.type)
                      ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <CheckSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      selectedTypes.includes(item.type) ? "text-indigo-600" : "text-slate-300"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Jumlah Soal
              </label>
              <span className="text-xs font-bold text-indigo-600">{count} Soal</span>
            </div>
            <input
              type="range"
              min={4}
              max={16}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memproses AI Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Paket Soal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
