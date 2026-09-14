"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  ListChecks,
  ToggleLeft,
  ArrowUpDown,
  Shuffle,
  FileQuestion,
  AlignLeft,
  Binary,
  MapPin,
  Target,
  Layers,
} from "lucide-react";
import { QuestionType } from "@/lib/types";

interface AddQuestionMenuProps {
  onAddType: (type: QuestionType) => void;
  onOpenAiModal?: () => void;
  variant?: "top" | "bottom";
}

const TYPE_ITEMS: { type: QuestionType; label: string; icon: React.ElementType; desc: string }[] = [
  { type: "MULTIPLE_CHOICE", label: "Multiple Choice", icon: CheckCircle2, desc: "4 opsi (A-D), 1 kunci benar" },
  { type: "MULTIPLE_SELECT", label: "Multiple Select", icon: ListChecks, desc: "5 opsi (A-E), 2-4 kunci benar" },
  { type: "TRUE_OR_FALSE", label: "True / False", icon: ToggleLeft, desc: "Pernyataan Benar / Salah" },
  { type: "MATCHING", label: "Matching", icon: ArrowUpDown, desc: "Menjodohkan Kolom Kiri & Kanan" },
  { type: "REORDER", label: "Reorder Sequence", icon: Shuffle, desc: "Urutan tahapan/kronologis acak" },
  { type: "FILL_IN_THE_BLANKS", label: "Fill in Blanks", icon: FileQuestion, desc: "Teks rumpang dengan [___]" },
  { type: "OPEN_ENDED", label: "Open Ended (Essay)", icon: AlignLeft, desc: "Pertanyaan HOTS dengan rubrik" },
  { type: "MATH_RESPONSE", label: "Math / STEM", icon: Binary, desc: "Rumus, angka presisi, LaTeX" },
  { type: "IMAGE_LABELING", label: "Image Labeling", icon: MapPin, desc: "Pasangkan kartu label ke pin gambar" },
  { type: "IMAGE_HOTSPOT", label: "Image Hotspot", icon: Target, desc: "Tunjuk area target spesifik gambar" },
  { type: "CATEGORIZE_ITEMS", label: "Categorize Items", icon: Layers, desc: "Kelompokkan kartu ke 2-3 kategori" },
];

export default function AddQuestionMenu({
  onAddType,
  onOpenAiModal,
  variant = "top",
}: AddQuestionMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (type: QuestionType) => {
    onAddType(type);
    setDropdownOpen(false);
  };

  return (
    <div ref={menuRef} className="relative inline-flex items-center gap-2 flex-wrap">
      {/* Quick Access Most Common Buttons */}
      <button
        type="button"
        onClick={() => onAddType("MULTIPLE_CHOICE")}
        className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Multiple Choice</span>
      </button>

      <button
        type="button"
        onClick={() => onAddType("MULTIPLE_SELECT")}
        className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Multi Select</span>
      </button>

      <button
        type="button"
        onClick={() => onAddType("TRUE_OR_FALSE")}
        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ True/False</span>
      </button>

      {/* Dropdown for All 8 Types */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-slate-800 transition shadow-xs"
        >
          <span>Tipe Lainnya (8 Tipe)</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div
            className={`absolute z-50 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 space-y-1 ${
              variant === "bottom" ? "bottom-full mb-2" : "top-full mt-2"
            } right-0 animate-pop`}
          >
            <div className="px-3 py-1.5 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pilih Dari 8 Tipe Soal
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-0.5">
              {TYPE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleSelect(item.type)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/80 transition flex items-start gap-2.5 group"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-900">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI Generate Button */}
      {onOpenAiModal && (
        <button
          type="button"
          onClick={onOpenAiModal}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-indigo-100 hover:from-indigo-700 hover:to-purple-700 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span>Buat dengan AI</span>
        </button>
      )}
    </div>
  );
}
