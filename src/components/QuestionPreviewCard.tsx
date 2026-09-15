"use client";

import React from "react";
import {
  HelpCircle,
  CheckCircle2,
  ListOrdered,
  Shuffle,
  AlignLeft,
  FileQuestion,
  Calculator,
  Image as ImageIcon,
  Crosshair,
  FolderTree,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Edit3,
  Check,
  Sparkles,
} from "lucide-react";
import { ParsedQuestion, QuestionType } from "@/lib/types";
import KidFriendlyQuestionText from "@/components/KidFriendlyQuestionText";

interface QuestionPreviewCardProps {
  question: ParsedQuestion;
  index: number;
  totalQuestions: number;
  isHighlighted?: boolean;
  onEdit: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const TYPE_CONFIG: Record<
  QuestionType,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  MULTIPLE_CHOICE: { label: "Pilihan Ganda", color: "bg-blue-50 text-blue-700 border-blue-200", icon: HelpCircle },
  MULTIPLE_SELECT: { label: "Pilihan Ganda Kompleks", color: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle2 },
  TRUE_OR_FALSE: { label: "Benar / Salah", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  MATCHING: { label: "Menjodohkan", color: "bg-amber-50 text-amber-800 border-amber-200", icon: Shuffle },
  REORDER: { label: "Urutan Kronologis", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: ListOrdered },
  FILL_IN_THE_BLANKS: { label: "Isian Singkat", color: "bg-cyan-50 text-cyan-800 border-cyan-200", icon: AlignLeft },
  OPEN_ENDED: { label: "Uraian / Esai", color: "bg-teal-50 text-teal-800 border-teal-200", icon: FileQuestion },
  MATH_RESPONSE: { label: "Respons Matematika", color: "bg-violet-50 text-violet-700 border-violet-200", icon: Calculator },
  IMAGE_LABELING: { label: "Image Labeling", color: "bg-rose-50 text-rose-700 border-rose-200", icon: ImageIcon },
  IMAGE_HOTSPOT: { label: "Image Hotspot", color: "bg-red-50 text-red-700 border-red-200", icon: Crosshair },
  CATEGORIZE_ITEMS: { label: "Pengelompokan Kategori", color: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: FolderTree },
};

export default function QuestionPreviewCard({
  question,
  index,
  totalQuestions,
  isHighlighted = false,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: QuestionPreviewCardProps) {
  const qType: QuestionType =
    Array.isArray(question.correct_answers) && question.correct_answers.length > 1
      ? "MULTIPLE_SELECT"
      : question.question_type || "MULTIPLE_CHOICE";
  const config = TYPE_CONFIG[qType] || TYPE_CONFIG.MULTIPLE_CHOICE;
  const TypeIcon = config.icon;

  const currentOptions =
    question.options && question.options.length > 0
      ? question.options
      : ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"];

  return (
    <div
      id={`question-card-${index}`}
      className={`bg-white rounded-2xl border transition-all duration-300 shadow-xs relative overflow-hidden group hover:border-indigo-300 ${
        isHighlighted
          ? "ring-4 ring-indigo-400/80 border-indigo-500 shadow-xl"
          : "border-slate-200"
      }`}
    >
      {/* Top Meta & Action Bar */}
      <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center justify-center px-3 py-1 bg-indigo-600 text-white rounded-full font-black text-xs shadow-2xs">
            Soal #{index + 1}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.color}`}
          >
            <TypeIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{config.label}</span>
          </span>
          {isHighlighted && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
              Focused
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 rounded-lg transition"
              title="Pindahkan ke Atas"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalQuestions - 1}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 rounded-lg transition"
              title="Pindahkan ke Bawah"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition"
              title="Duplikasi Soal"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <div className="relative group/trash flex items-center">
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition"
                aria-label="Hapus Soal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/trash:flex flex-col items-center pointer-events-none z-30">
                <span className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-md whitespace-nowrap">
                  Hapus Soal
                </span>
                <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Body (Click to Edit) */}
      <div
        onClick={onEdit}
        className="p-5 sm:p-6 space-y-4 cursor-pointer hover:bg-indigo-50/20 transition group/body"
      >
        {/* Question Text */}
        <div>
          {question.question_text ? (
            <KidFriendlyQuestionText text={question.question_text} />
          ) : (
            <span className="italic text-slate-400 font-normal">
              (Teks pertanyaan belum diisi - Klik di sini untuk mengedit)
            </span>
          )}
        </div>

        {/* Question Image if present */}
        {question.image_url && (
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2.5 max-w-md space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.image_url}
              alt={question.alt_text || `Diagram #${index + 1}`}
              className="max-h-52 rounded-lg object-contain mx-auto"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
              <span className="font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px]">
                {question.image_source_type || "NONE"}
              </span>
              {question.alt_text && (
                <span className="truncate max-w-[260px] italic text-slate-600 font-medium" title={question.alt_text}>
                  &ldquo;{question.alt_text}&rdquo;
                </span>
              )}
            </div>
          </div>
        )}

        {/* Answer Options Summary */}
        <div className="pt-1">
          {/* TIPE 1: MULTIPLE CHOICE */}
          {qType === "MULTIPLE_CHOICE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentOptions.map((opt, oIdx) => {
                const isCorrect = question.correct_answer_index === oIdx;
                const optItem = question.option_items?.[oIdx];
                const optImage = optItem?.image_url;
                return (
                  <div
                    key={oIdx}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isCorrect
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-300"
                        : "bg-slate-50/80 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center uppercase shrink-0 ${
                        isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-slate-700 border border-slate-300"
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    {optImage && (
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={optImage}
                          alt={optItem?.alt_text || `Opsi ${String.fromCharCode(65 + oIdx)}`}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                        />
                      </div>
                    )}
                    <span className="truncate flex-1">
                      {opt ? opt : optImage ? <span className="italic text-indigo-700 font-medium">(Opsi Gambar)</span> : <span className="italic text-slate-400">(Kosong)</span>}
                    </span>
                    {isCorrect && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                        <Check className="w-3 h-3" />
                        <span>Kunci</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TIPE 2: MULTIPLE SELECT */}
          {qType === "MULTIPLE_SELECT" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentOptions.map((opt, oIdx) => {
                const isCorrect = (question.correct_answers || [
                  question.correct_answer_index ?? 0,
                ]).includes(oIdx);
                const optItem = question.option_items?.[oIdx];
                const optImage = optItem?.image_url;
                return (
                  <div
                    key={oIdx}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isCorrect
                        ? "bg-purple-50 border-purple-400 text-purple-950 ring-1 ring-purple-300"
                        : "bg-slate-50/80 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center uppercase shrink-0 ${
                        isCorrect
                          ? "bg-purple-600 text-white"
                          : "bg-white text-slate-700 border border-slate-300"
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    {optImage && (
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={optImage}
                          alt={optItem?.alt_text || `Opsi ${String.fromCharCode(65 + oIdx)}`}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                        />
                      </div>
                    )}
                    <span className="truncate flex-1">
                      {opt ? opt : optImage ? <span className="italic text-purple-700 font-medium">(Opsi Gambar)</span> : <span className="italic text-slate-400">(Kosong)</span>}
                    </span>
                    {isCorrect && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md shrink-0">
                        <Check className="w-3 h-3" />
                        <span>Kunci Benar</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TIPE 3: TRUE OR FALSE */}
          {qType === "TRUE_OR_FALSE" && (
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 ${
                  question.correct_answer_index === 0
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                {question.correct_answer_index === 0 && <Check className="w-3.5 h-3.5" />}
                <span>BENAR</span>
              </span>
              <span
                className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 ${
                  question.correct_answer_index === 1
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                {question.correct_answer_index === 1 && <Check className="w-3.5 h-3.5" />}
                <span>SALAH</span>
              </span>
            </div>
          )}

          {/* TIPE 4: MATCHING */}
          {qType === "MATCHING" && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Pasangan Kunci ({question.matching_pairs?.length || 0} Pasangan):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(question.matching_pairs || []).map((pair, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-xs font-semibold text-amber-950"
                  >
                    <span className="truncate">{pair.left}</span>
                    <span className="text-amber-500 font-bold shrink-0">➔</span>
                    <span className="font-bold text-amber-800 truncate">{pair.right}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TIPE 5: REORDER */}
          {qType === "REORDER" && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5 w-full">
                Urutan yang Benar:
              </span>
              {(question.reorder_items || []).map((step, sIdx) => (
                <span
                  key={sIdx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-900"
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                    {sIdx + 1}
                  </span>
                  <span>{step}</span>
                </span>
              ))}
            </div>
          )}

          {/* TIPE 6: FILL IN THE BLANKS */}
          {qType === "FILL_IN_THE_BLANKS" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Kata Kunci Jawaban:
              </span>
              {(question.blanks_keywords || []).map((kw, kIdx) => (
                <span
                  key={kIdx}
                  className="px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-900 border border-cyan-300 text-xs font-bold"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* TIPE 7: OPEN ENDED */}
          {qType === "OPEN_ENDED" && (
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-900 font-medium">
              <span className="font-bold">Panduan Penilaian / Rubrik: </span>
              <span>{question.rubric?.join(", ") || "Tersedia kriteria penilaian esai siswa."}</span>
            </div>
          )}

          {/* TIPE 8: MATH RESPONSE */}
          {qType === "MATH_RESPONSE" && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Kunci Jawaban Rumus / Nilai:</span>
              <code className="px-3 py-1 rounded-lg bg-violet-100 text-violet-900 border border-violet-300 font-mono text-xs font-bold">
                {question.math_solution || "x = ..."}
              </code>
            </div>
          )}

          {/* TIPE 9: IMAGE LABELING */}
          {qType === "IMAGE_LABELING" && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-700 font-semibold">
              <span className="font-bold text-rose-700">Label Target:</span>
              {(question.label_targets || []).map((item, lIdx) => (
                <span
                  key={lIdx}
                  className="px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800"
                >
                  Pin {lIdx + 1}: {item.label}
                </span>
              ))}
            </div>
          )}

          {/* TIPE 10: IMAGE HOTSPOT */}
          {qType === "IMAGE_HOTSPOT" && (
            <div className="text-xs font-semibold text-red-900 bg-red-50 p-2 rounded-lg border border-red-200 inline-block">
              Koordinat Target: X {question.hotspot_zone?.x ?? 50}%, Y {question.hotspot_zone?.y ?? 50}% (Radius: {question.hotspot_zone?.radius ?? 15}%)
            </div>
          )}

          {/* TIPE 11: CATEGORIZE ITEMS */}
          {qType === "CATEGORIZE_ITEMS" && (
            <div className="flex flex-wrap gap-2">
              {(question.categories || []).map((cat, cIdx) => (
                <div
                  key={cIdx}
                  className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-950"
                >
                  <span>{cat}</span>:{" "}
                  <span className="font-normal text-emerald-800">
                    {(question.categorize_items || [])
                      .filter((i) => i.category === cat)
                      .map((i) => i.text)
                      .join(", ") || "Belum ada item"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Explanation Preview if available */}
        {question.explanation && (
          <div className="pt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
            <span className="font-bold text-indigo-700 shrink-0">💡 Pembahasan:</span>
            <span className="line-clamp-2">{question.explanation}</span>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-[11px] font-medium text-slate-600 hidden sm:inline">
          Klik kartu atau tombol di samping untuk mengedit soal secara terfokus
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 shadow-2xs flex items-center justify-center gap-1.5 transition"
        >
          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Edit Soal #{index + 1}</span>
        </button>
      </div>
    </div>
  );
}
