"use client";

import React, { useState } from "react";
import { Question, ParsedQuestion, QuestionType } from "@/lib/types";
import { convertQuestionType, ConversionResult } from "@/lib/questionConverter";
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ListCheck,
  CheckSquare,
  ArrowUpDown,
  FileEdit,
  PenTool,
  Sigma,
  MapPin,
  Target,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface QuestionConversionModalProps {
  question: Question | ParsedQuestion;
  isOpen: boolean;
  onClose: () => void;
  onApply: (converted: ParsedQuestion) => void;
}

const QUESTION_TYPE_CONFIG: Record<
  QuestionType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  MULTIPLE_CHOICE: {
    label: "Pilihan Ganda",
    icon: HelpCircle,
    color: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400",
  },
  MULTIPLE_SELECT: {
    label: "Pilihan Ganda Kompleks",
    icon: CheckSquare,
    color: "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400",
  },
  TRUE_OR_FALSE: {
    label: "Benar / Salah",
    icon: CheckCircle2,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400",
  },
  MATCHING: {
    label: "Menjodohkan",
    icon: ListCheck,
    color: "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400",
  },
  REORDER: {
    label: "Urutan Kronologis",
    icon: ArrowUpDown,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:border-cyan-400",
  },
  FILL_IN_THE_BLANKS: {
    label: "Isian Rumpang",
    icon: FileEdit,
    color: "bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400",
  },
  OPEN_ENDED: {
    label: "Uraian / Esai",
    icon: PenTool,
    color: "bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-400",
  },
  MATH_RESPONSE: {
    label: "Jawaban Eksak Matematika",
    icon: Sigma,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400",
  },
  IMAGE_LABELING: {
    label: "Label Gambar (Pin)",
    icon: MapPin,
    color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:border-fuchsia-400",
  },
  IMAGE_HOTSPOT: {
    label: "Hotspot Gambar (Area Sentuh)",
    icon: Target,
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400",
  },
  CATEGORIZE_ITEMS: {
    label: "Pengelompokan (Kategori)",
    icon: Layers,
    color: "bg-lime-50 text-lime-700 border-lime-200 hover:border-lime-400",
  },
};

export default function QuestionConversionModal({
  question,
  isOpen,
  onClose,
  onApply,
}: QuestionConversionModalProps) {
  const currentType: QuestionType = question.question_type || "MULTIPLE_CHOICE";
  const defaultTarget: QuestionType =
    currentType === "MULTIPLE_CHOICE" ? "MULTIPLE_SELECT" : "MULTIPLE_CHOICE";

  const [selectedTargetType, setSelectedTargetType] = useState<QuestionType>(defaultTarget);

  if (!isOpen) return null;

  // Calculate conversion on the fly
  const result: ConversionResult = convertQuestionType(question, selectedTargetType);
  const { report, convertedQuestion } = result;

  const CurrentIcon = QUESTION_TYPE_CONFIG[currentType]?.icon || HelpCircle;
  const TargetIcon = QUESTION_TYPE_CONFIG[selectedTargetType]?.icon || HelpCircle;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-pop border border-slate-100 my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Konversi Tipe Soal Cerdas</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Smart UX
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ubah tipe soal dengan pemetaan data otomatis sesuai aturan pedagogis dan UX.
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
          {/* Target Type Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Tipe Soal Target:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(QUESTION_TYPE_CONFIG) as QuestionType[]).map((typeKey) => {
                const cfg = QUESTION_TYPE_CONFIG[typeKey];
                const Icon = cfg.icon;
                const isCurrent = typeKey === currentType;
                const isSelected = typeKey === selectedTargetType;

                return (
                  <button
                    key={typeKey}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setSelectedTargetType(typeKey)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition text-xs font-bold ${
                      isCurrent
                        ? "opacity-35 bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400"
                        : isSelected
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-400 shadow-xs"
                        : cfg.color
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cfg.label}</span>
                    {isCurrent && (
                      <span className="ml-auto text-[9px] text-slate-400 font-normal shrink-0">
                        (Saat ini)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transition Header Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CurrentIcon className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-700">
                {QUESTION_TYPE_CONFIG[currentType]?.label}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-500 animate-pulse" />
            <div className="flex items-center gap-2">
              <TargetIcon className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-700">
                {QUESTION_TYPE_CONFIG[selectedTargetType]?.label}
              </span>
            </div>
          </div>

          {/* Structured Output Report */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Format Laporan Hasil Konversi</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px]">
                Status: {report.status}
              </span>
            </div>

            {/* UX Component Changes */}
            <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                Perubahan Komponen UX Siswa:
              </span>
              <p className="font-semibold text-slate-800">{report.uxChange}</p>
            </div>

            {/* Adjusted Question Text */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Teks Soal Hasil Penyesuaian:
              </span>
              <p className="font-bold text-slate-900">{report.adjustedQuestionText}</p>
            </div>

            {/* New Data Structure */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Opsi / Struktur Data Baru:
              </span>
              <p className="font-medium text-slate-700 font-mono text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                {report.newDataStructure}
              </p>
            </div>

            {/* New Answer Key */}
            <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                Kunci Jawaban Baru:
              </span>
              <p className="font-bold text-emerald-800">{report.newAnswerKey}</p>
            </div>

            {/* Editor Notes */}
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-1">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Catatan Editor / Alasan Penyesuaian:
              </span>
              <p className="text-amber-950 font-medium text-[11px] leading-relaxed">
                {report.editorNotes}
              </p>
            </div>
          </div>
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
            onClick={() => {
              onApply(convertedQuestion);
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Terapkan Konversi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
