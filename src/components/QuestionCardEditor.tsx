"use client";

import { useState, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Image as ImageIcon,
  Plus,
  HelpCircle,
  MapPin,
  Target,
  Layers,
  Tag,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ParsedQuestion, QuestionType, ImageSourceType, QuestionOptionItem } from "@/lib/types";
import QuestionConversionModal from "@/components/QuestionConversionModal";
import SmartDistractorModal from "@/components/SmartDistractorModal";
import ImageAttachmentModal from "@/components/ImageAttachmentModal";

interface QuestionCardEditorProps {
  question: ParsedQuestion;
  index: number;
  totalQuestions: number;
  isHighlighted?: boolean;
  isModalMode?: boolean;
  onUpdate: (updated: ParsedQuestion) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const TYPE_BADGES: Record<QuestionType, { label: string; color: string }> = {
  MULTIPLE_CHOICE: { label: "Pilihan Ganda", color: "bg-blue-100 text-blue-800 border-blue-200" },
  MULTIPLE_SELECT: { label: "Pilihan Ganda Kompleks", color: "bg-purple-100 text-purple-800 border-purple-200" },
  TRUE_OR_FALSE: { label: "Benar / Salah", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  MATCHING: { label: "Menjodohkan", color: "bg-amber-100 text-amber-800 border-amber-200" },
  REORDER: { label: "Urutan Kronologis", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  FILL_IN_THE_BLANKS: { label: "Isian Rumpang", color: "bg-teal-100 text-teal-800 border-teal-200" },
  OPEN_ENDED: { label: "Esai / Uraian", color: "bg-rose-100 text-rose-800 border-rose-200" },
  MATH_RESPONSE: { label: "Matematika / STEM", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  IMAGE_LABELING: { label: "Label Gambar (Pin)", color: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" },
  IMAGE_HOTSPOT: { label: "Hotspot Gambar", color: "bg-orange-100 text-orange-800 border-orange-200" },
  CATEGORIZE_ITEMS: { label: "Pengelompokan (Kategori)", color: "bg-lime-100 text-lime-800 border-lime-200" },
};

export default function QuestionCardEditor({
  question,
  index,
  totalQuestions,
  isHighlighted,
  isModalMode = false,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: QuestionCardEditorProps) {
  const qType: QuestionType = question.question_type || "MULTIPLE_CHOICE";
  const badgeInfo = TYPE_BADGES[qType] || TYPE_BADGES.MULTIPLE_CHOICE;
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [isDistractorModalOpen, setIsDistractorModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [activeOptionImageIndex, setActiveOptionImageIndex] = useState<number | null>(null);

  const handleApplyQuestionImage = (imageData: {
    image_url: string;
    image_source_type: ImageSourceType;
    alt_text: string;
  }) => {
    onUpdate({
      ...question,
      image_url: imageData.image_url || null,
      image_source_type: imageData.image_source_type,
      alt_text: imageData.alt_text,
    });
  };

  const handleApplyOptionImage = (imageData: {
    image_url: string;
    image_source_type: ImageSourceType;
    alt_text: string;
  }) => {
    if (activeOptionImageIndex === null) return;
    const currentOptions = [...(question.options || [])];
    const currentOptionItems: QuestionOptionItem[] = question.option_items
      ? [...question.option_items]
      : currentOptions.map((opt, idx) => ({
          option_letter: String.fromCharCode(65 + idx),
          text: opt,
          image_source_type: "NONE" as ImageSourceType,
          image_url: "",
          alt_text: "",
          is_correct: question.correct_answer_index === idx,
        }));

    while (currentOptionItems.length < currentOptions.length) {
      const idx = currentOptionItems.length;
      currentOptionItems.push({
        option_letter: String.fromCharCode(65 + idx),
        text: currentOptions[idx] || "",
        image_source_type: "NONE",
        image_url: "",
        alt_text: "",
        is_correct: question.correct_answer_index === idx,
      });
    }

    currentOptionItems[activeOptionImageIndex] = {
      ...currentOptionItems[activeOptionImageIndex],
      image_url: imageData.image_url,
      image_source_type: imageData.image_source_type,
      alt_text: imageData.alt_text,
    };

    onUpdate({
      ...question,
      option_items: currentOptionItems,
    });
    setActiveOptionImageIndex(null);
  };

  // Question Text
  const handleTextChange = (text: string) => {
    onUpdate({ ...question, question_text: text });
  };

  // Explanation
  const handleExplanationChange = (text: string) => {
    onUpdate({ ...question, explanation: text });
  };

  // MULTIPLE_CHOICE Dynamic Options (Min 2, Max 6, Default 4)
  const currentMcqOptions =
    question.options && question.options.length >= 2
      ? question.options
      : ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"];

  // Ensure MULTIPLE_CHOICE always has valid options initialized in parent state
  useEffect(() => {
    if (qType === "MULTIPLE_CHOICE" && (!question.options || question.options.length < 2)) {
      onUpdate({
        ...question,
        options: currentMcqOptions,
        correct_answer_index: question.correct_answer_index ?? 0,
      });
    }
  }, [qType, question.options]);

  const handleAddMcqOption = () => {
    if (currentMcqOptions.length >= 6) return;
    const nextLetter = String.fromCharCode(65 + currentMcqOptions.length);
    const updated = [...currentMcqOptions, `Pilihan ${nextLetter}`];
    onUpdate({ ...question, options: updated });
  };

  const handleRemoveMcqOption = (optIdx: number) => {
    if (currentMcqOptions.length <= 2) return;
    const updated = currentMcqOptions.filter((_, idx) => idx !== optIdx);
    let newCorrect = question.correct_answer_index ?? 0;
    if (newCorrect === optIdx) {
      newCorrect = 0;
    } else if (newCorrect > optIdx) {
      newCorrect -= 1;
    }
    onUpdate({ ...question, options: updated, correct_answer_index: newCorrect });
  };

  const handleMcqOptionChange = (optIdx: number, val: string) => {
    const updated = [...currentMcqOptions];
    updated[optIdx] = val;
    onUpdate({ ...question, options: updated });
  };

  // MULTIPLE_CHOICE & TRUE_OR_FALSE
  const handleOptionChange = (optIdx: number, val: string) => {
    const updatedOpts = [...question.options];
    updatedOpts[optIdx] = val;
    onUpdate({ ...question, options: updatedOpts });
  };

  const handleSetCorrectIndex = (optIdx: number) => {
    onUpdate({ ...question, correct_answer_index: optIdx });
  };

  // MULTIPLE_SELECT
  const handleToggleMultiCorrect = (optIdx: number) => {
    const current = question.correct_answers || [question.correct_answer_index ?? 0];
    let next: number[];
    if (current.includes(optIdx)) {
      if (current.length <= 1) return; // Keep at least one
      next = current.filter((i) => i !== optIdx);
    } else {
      next = [...current, optIdx];
    }
    onUpdate({ ...question, correct_answers: next });
  };

  // MATCHING
  const handleAddPair = () => {
    const pairs = question.matching_pairs ? [...question.matching_pairs] : [];
    pairs.push({ left: `Item Kiri ${pairs.length + 1}`, right: `Pasangan Kanan ${pairs.length + 1}` });
    onUpdate({ ...question, matching_pairs: pairs });
  };

  const handleUpdatePair = (pairIdx: number, side: "left" | "right", val: string) => {
    const pairs = question.matching_pairs ? [...question.matching_pairs] : [];
    if (!pairs[pairIdx]) return;
    pairs[pairIdx][side] = val;
    onUpdate({ ...question, matching_pairs: pairs });
  };

  const handleRemovePair = (pairIdx: number) => {
    const pairs = (question.matching_pairs || []).filter((_, i) => i !== pairIdx);
    onUpdate({ ...question, matching_pairs: pairs });
  };

  // REORDER
  const handleAddReorderStep = () => {
    const steps = question.reorder_items ? [...question.reorder_items] : [];
    steps.push(`Tahapan ${steps.length + 1}`);
    const order = steps.map((_, i) => i);
    onUpdate({ ...question, reorder_items: steps, correct_order: order });
  };

  const handleUpdateReorderStep = (stepIdx: number, val: string) => {
    const steps = question.reorder_items ? [...question.reorder_items] : [];
    steps[stepIdx] = val;
    onUpdate({ ...question, reorder_items: steps });
  };

  const handleMoveStep = (stepIdx: number, dir: -1 | 1) => {
    const targetIdx = stepIdx + dir;
    const steps = question.reorder_items ? [...question.reorder_items] : [];
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const item = steps.splice(stepIdx, 1)[0];
    steps.splice(targetIdx, 0, item);
    const order = steps.map((_, i) => i);
    onUpdate({ ...question, reorder_items: steps, correct_order: order });
  };

  const handleRemoveReorderStep = (stepIdx: number) => {
    const steps = (question.reorder_items || []).filter((_, i) => i !== stepIdx);
    const order = steps.map((_, i) => i);
    onUpdate({ ...question, reorder_items: steps, correct_order: order });
  };

  // FILL_IN_THE_BLANKS
  const handleBlanksKeywordsChange = (text: string) => {
    const keywords = text.split(",").map((k) => k.trim()).filter(Boolean);
    onUpdate({ ...question, blanks_keywords: keywords });
  };

  // OPEN_ENDED
  const handleRubricChange = (rubricIdx: number, val: string) => {
    const rubric = question.rubric ? [...question.rubric] : [];
    rubric[rubricIdx] = val;
    onUpdate({ ...question, rubric });
  };

  const handleAddRubricPoint = () => {
    const rubric = question.rubric ? [...question.rubric] : [];
    rubric.push(`Poin penilaian ${rubric.length + 1}`);
    onUpdate({ ...question, rubric });
  };

  const handleRemoveRubricPoint = (rubricIdx: number) => {
    const rubric = (question.rubric || []).filter((_, i) => i !== rubricIdx);
    onUpdate({ ...question, rubric });
  };

  // MATH_RESPONSE
  const handleMathSolutionChange = (val: string) => {
    onUpdate({ ...question, math_solution: val });
  };

  // IMAGE_LABELING
  const handleImageContextChange = (val: string) => {
    onUpdate({ ...question, image_context: val });
  };

  const handleImageUrlChange = (val: string) => {
    onUpdate({ ...question, image_url: val });
  };

  const handleAddLabelTarget = () => {
    const current = question.label_targets || [];
    const newPinNum = current.length + 1;
    const newPin = {
      id: `pin-${Date.now()}-${newPinNum}`,
      label: `Label ${newPinNum}`,
      x: 50,
      y: Math.min(20 + newPinNum * 15, 85),
      target_name: `Titik #${newPinNum}`,
    };
    onUpdate({ ...question, label_targets: [...current, newPin] });
  };

  const handleRemoveLabelTarget = (tIdx: number) => {
    const current = [...(question.label_targets || [])];
    current.splice(tIdx, 1);
    onUpdate({ ...question, label_targets: current });
  };

  const handleUpdateLabelTarget = (tIdx: number, field: "label" | "target_name" | "x" | "y", val: string | number) => {
    const current = [...(question.label_targets || [])];
    current[tIdx] = { ...current[tIdx], [field]: val };
    onUpdate({ ...question, label_targets: current });
  };

  // IMAGE_HOTSPOT
  const handleHotspotChange = (field: "x" | "y" | "radius" | "description", val: string | number) => {
    const current = question.hotspot_zone || { x: 50, y: 50, radius: 15, description: "" };
    onUpdate({ ...question, hotspot_zone: { ...current, [field]: val } });
  };

  // CATEGORIZE_ITEMS
  const handleAddCategory = () => {
    const current = question.categories || ["Kategori A", "Kategori B"];
    if (current.length >= 4) return;
    const updated = [...current, `Kategori ${String.fromCharCode(65 + current.length)}`];
    onUpdate({ ...question, categories: updated });
  };

  const handleRemoveCategory = (catIdx: number) => {
    const currentCats = [...(question.categories || [])];
    if (currentCats.length <= 2) return;
    const removedCat = currentCats[catIdx];
    currentCats.splice(catIdx, 1);
    const updatedItems = (question.categorize_items || []).filter((item) => item.category !== removedCat);
    onUpdate({ ...question, categories: currentCats, categorize_items: updatedItems });
  };

  const handleUpdateCategory = (catIdx: number, newName: string) => {
    const currentCats = [...(question.categories || [])];
    const oldName = currentCats[catIdx];
    currentCats[catIdx] = newName;
    const updatedItems = (question.categorize_items || []).map((item) =>
      item.category === oldName ? { ...item, category: newName } : item
    );
    onUpdate({ ...question, categories: currentCats, categorize_items: updatedItems });
  };

  const handleAddCategorizeItem = () => {
    const currentItems = question.categorize_items || [];
    const defaultCat = question.categories?.[0] || "Kategori A";
    onUpdate({
      ...question,
      categorize_items: [...currentItems, { text: `Item #${currentItems.length + 1}`, category: defaultCat }],
    });
  };

  const handleRemoveCategorizeItem = (iIdx: number) => {
    const currentItems = [...(question.categorize_items || [])];
    currentItems.splice(iIdx, 1);
    onUpdate({ ...question, categorize_items: currentItems });
  };

  const handleUpdateCategorizeItem = (iIdx: number, field: "text" | "category", val: string) => {
    const currentItems = [...(question.categorize_items || [])];
    currentItems[iIdx] = { ...currentItems[iIdx], [field]: val };
    onUpdate({ ...question, categorize_items: currentItems });
  };

  return (
    <div
      id={!isModalMode ? `question-card-${index}` : undefined}
      className={
        isModalMode
          ? "space-y-5"
          : `bg-white p-6 rounded-2xl border transition-all duration-300 shadow-xs space-y-4 relative ${
              isHighlighted ? "ring-4 ring-indigo-400/80 border-indigo-500 shadow-xl" : "border-slate-200"
            }`
      }
    >
      {/* Action Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-bold text-xs">
            Question #{index + 1}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeInfo.color}`}>
            {badgeInfo.label}
          </span>
          {isHighlighted && !isModalMode && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
              Focused
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isModalMode && onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 rounded-lg transition"
              title="Move Up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {!isModalMode && onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalQuestions - 1}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 rounded-lg transition"
              title="Move Down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsConversionModalOpen(true)}
            className="px-2.5 py-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="Konversi Tipe Soal Cerdas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="inline">Konversi Tipe</span>
          </button>
          {!isModalMode && onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
              title="Duplicate Question"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          
          {/* Delete Button with Interactive Tooltip */}
          {!isModalMode && onDelete && (
            <div className="relative group flex items-center">
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Hapus Soal"
                aria-label="Hapus Soal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 whitespace-nowrap bg-slate-900 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-xl border border-slate-700">
                Hapus Soal
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Question Text & Image Trigger */}
      <div>
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <label className="block text-xs font-bold text-slate-700">
            Teks Soal / Pertanyaan
          </label>
          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition shadow-2xs"
            title="Lampirkan Gambar (Upload / Direct Link / Google Search)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>{question.image_url ? "Kelola Aset Gambar" : "Lampirkan Gambar"}</span>
          </button>
        </div>
        <textarea
          rows={2}
          value={question.question_text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Tulis pertanyaan soal di sini..."
          className="w-full p-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
        />
      </div>

      {/* Diagram / Image with Source Badge & Alt Text */}
      {question.image_url && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-slate-800 font-bold">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Aset Gambar Soal</span>
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                {question.image_source_type || "DIRECT_LINK"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Ubah
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ ...question, image_url: null, image_source_type: "NONE", alt_text: "" })}
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                Hapus
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2.5 rounded-xl border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.image_url}
              alt={question.alt_text || `Diagram #${index + 1}`}
              className="max-h-40 max-w-xs rounded-lg object-contain bg-slate-50 border border-slate-100 p-1"
            />
            {question.alt_text && (
              <div className="text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Alt Text (Aksesibilitas):
                </span>
                <p className="leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-700">
                  {question.alt_text}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TIPE 1: MULTIPLE_CHOICE (Min 2, Max 6, Default 4) */}
      {qType === "MULTIPLE_CHOICE" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="block text-xs font-bold text-slate-700">
              Pilihan Jawaban (Pilih radio untuk 1 kunci jawaban yang benar)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-700 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {currentMcqOptions.length} Opsi (A - {String.fromCharCode(64 + currentMcqOptions.length)})
              </span>
              <button
                type="button"
                onClick={() => setIsDistractorModalOpen(true)}
                className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-2xs"
                title="Buat Pengecoh Otomatis Berdasarkan Teks Soal & Kunci Jawaban"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Pengecoh AI</span>
              </button>
              <button
                type="button"
                onClick={handleAddMcqOption}
                disabled={currentMcqOptions.length >= 6}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                title="Tambah Pilihan Jawaban (Maksimal 6)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pilihan</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentMcqOptions.map((opt, oIdx) => {
              const optItem = question.option_items?.[oIdx];
              return (
                <div
                  key={oIdx}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                    question.correct_answer_index === oIdx
                      ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`correct-mcq-${index}`}
                    checked={question.correct_answer_index === oIdx}
                    onChange={() => handleSetCorrectIndex(oIdx)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                    title={`Tandai Opsi ${String.fromCharCode(65 + oIdx)} sebagai Kunci Benar`}
                  />
                  <span className="font-bold text-xs text-slate-700 uppercase w-4 shrink-0">
                    {String.fromCharCode(65 + oIdx)}.
                  </span>
                  {optItem?.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={optItem.image_url}
                      alt={optItem.alt_text || `Opsi ${String.fromCharCode(65 + oIdx)}`}
                      className="w-9 h-9 object-cover rounded-lg border border-slate-300 shrink-0 bg-white"
                      title={optItem.alt_text || "Gambar Opsi"}
                    />
                  )}
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleMcqOptionChange(oIdx, e.target.value)}
                    placeholder={
                      optItem?.image_url
                        ? "(Opsi Gambar Murni - Teks Kosong)"
                        : `Teks Pilihan ${String.fromCharCode(65 + oIdx)}...`
                    }
                    className="flex-1 bg-transparent text-sm font-medium focus:outline-hidden text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveOptionImageIndex(oIdx)}
                    className={`p-1.5 rounded-lg border transition shrink-0 ${
                      optItem?.image_url
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                        : "text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 border-transparent"
                    }`}
                    title={optItem?.image_url ? "Kelola Gambar Opsi" : "Lampirkan Gambar ke Opsi"}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  {currentMcqOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMcqOption(oIdx)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                      title={`Hapus Pilihan ${String.fromCharCode(65 + oIdx)}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TIPE 2: MULTIPLE_SELECT */}
      {qType === "MULTIPLE_SELECT" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-purple-700">
              Pilihan Ganda Kompleks (Centang 2 s/d 4 kunci jawaban yang benar)
            </label>
            <span className="text-[11px] text-purple-600 font-bold">5 Opsi (A-E)</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {(question.options.length >= 5 ? question.options : [...question.options, "Opsi D", "Opsi E"]).slice(0, 5).map((opt, oIdx) => {
              const isCorrect = (question.correct_answers || [question.correct_answer_index ?? 0]).includes(oIdx);
              const optItem = question.option_items?.[oIdx];
              return (
                <div
                  key={oIdx}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                    isCorrect
                      ? "bg-purple-50 border-purple-400 ring-1 ring-purple-400"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isCorrect}
                    onChange={() => handleToggleMultiCorrect(oIdx)}
                    className="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs text-slate-700 uppercase w-4">
                    {String.fromCharCode(65 + oIdx)}.
                  </span>
                  {optItem?.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={optItem.image_url}
                      alt={optItem.alt_text || `Opsi ${String.fromCharCode(65 + oIdx)}`}
                      className="w-9 h-9 object-cover rounded-lg border border-slate-300 shrink-0 bg-white"
                      title={optItem.alt_text || "Gambar Opsi"}
                    />
                  )}
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                    placeholder={
                      optItem?.image_url
                        ? "(Opsi Gambar Murni - Teks Kosong)"
                        : `Teks Pilihan ${String.fromCharCode(65 + oIdx)}...`
                    }
                    className="flex-1 bg-transparent text-sm font-medium focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveOptionImageIndex(oIdx)}
                    className={`p-1.5 rounded-lg border transition shrink-0 ${
                      optItem?.image_url
                        ? "bg-purple-100 text-purple-700 border-purple-300"
                        : "text-slate-400 hover:text-purple-600 hover:bg-slate-200/60 border-transparent"
                    }`}
                    title={optItem?.image_url ? "Kelola Gambar Opsi" : "Lampirkan Gambar ke Opsi"}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  {isCorrect && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Kunci Benar
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TIPE 3: TRUE_OR_FALSE */}
      {qType === "TRUE_OR_FALSE" && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Kunci Jawaban Pernyataan
          </label>
          <div className="grid grid-cols-2 gap-3">
            {["Benar", "Salah"].map((val, oIdx) => (
              <label
                key={val}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm cursor-pointer transition ${
                  question.correct_answer_index === oIdx
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name={`correct-tf-${index}`}
                  checked={question.correct_answer_index === oIdx}
                  onChange={() => handleSetCorrectIndex(oIdx)}
                  className="w-4 h-4 text-emerald-600"
                />
                <span>{val}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* TIPE 4: MATCHING */}
      {qType === "MATCHING" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-amber-800">
              Pasangan Menjodohkan (Kolom Kiri = Kunci/Stimulus, Kolom Kanan = Pasangan Benar)
            </label>
            <button
              type="button"
              onClick={handleAddPair}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pasangan</span>
            </button>
          </div>

          <div className="space-y-2">
            {(question.matching_pairs && question.matching_pairs.length > 0
              ? question.matching_pairs
              : [
                  { left: "Item Kiri 1", right: "Pasangan Kanan 1" },
                  { left: "Item Kiri 2", right: "Pasangan Kanan 2" },
                  { left: "Item Kiri 3", right: "Pasangan Kanan 3" },
                ]
            ).map((pair, pIdx) => (
              <div key={pIdx} className="flex items-center gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-700 w-6 text-center">{pIdx + 1}.</span>
                <input
                  type="text"
                  value={pair.left}
                  onChange={(e) => handleUpdatePair(pIdx, "left", e.target.value)}
                  placeholder="Stimulus / Kunci Kiri"
                  className="flex-1 p-2 rounded-lg bg-white border border-amber-300 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                />
                <span className="text-amber-500 font-bold">➔</span>
                <input
                  type="text"
                  value={pair.right}
                  onChange={(e) => handleUpdatePair(pIdx, "right", e.target.value)}
                  placeholder="Pasangan Jawaban Kanan"
                  className="flex-1 p-2 rounded-lg bg-white border border-amber-300 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                />
                {(question.matching_pairs || []).length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePair(pIdx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIPE 5: REORDER */}
      {qType === "REORDER" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-cyan-800">
              Tahapan Kronologis yang Benar (Siswa akan menerima soal dalam urutan acak)
            </label>
            <button
              type="button"
              onClick={handleAddReorderStep}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tahap</span>
            </button>
          </div>

          <div className="space-y-2">
            {(question.reorder_items && question.reorder_items.length > 0
              ? question.reorder_items
              : ["Tahap 1", "Tahap 2", "Tahap 3", "Tahap 4"]
            ).map((step, sIdx, arr) => (
              <div key={sIdx} className="flex items-center gap-2 bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-200">
                <span className="text-xs font-bold text-cyan-800 w-8">Langkah {sIdx + 1}</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => handleUpdateReorderStep(sIdx, e.target.value)}
                  className="flex-1 p-2 rounded-lg bg-white border border-cyan-300 text-xs font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  disabled={sIdx === 0}
                  onClick={() => handleMoveStep(sIdx, -1)}
                  className="p-1 text-slate-500 hover:text-cyan-700 disabled:opacity-30"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={sIdx === arr.length - 1}
                  onClick={() => handleMoveStep(sIdx, 1)}
                  className="p-1 text-slate-500 hover:text-cyan-700 disabled:opacity-30"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {arr.length > 3 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveReorderStep(sIdx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIPE 6: FILL_IN_THE_BLANKS */}
      {qType === "FILL_IN_THE_BLANKS" && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-teal-800">
            Kata Kunci Kunci Jawaban Eksak (Gunakan koma jika ada alternatif jawaban)
          </label>
          <input
            type="text"
            value={(question.blanks_keywords || []).join(", ")}
            onChange={(e) => handleBlanksKeywordsChange(e.target.value)}
            placeholder="Contoh: Fotosintesis, Oksigen"
            className="w-full p-2.5 rounded-xl bg-teal-50/50 border border-teal-300 text-xs font-semibold text-teal-900 focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
          />
          <p className="text-[11px] text-slate-700 font-medium">
            *Pastikan pada teks soal di atas terdapat simbol <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-teal-700">[___]</code> sebagai bagian yang rumpang.
          </p>
        </div>
      )}

      {/* TIPE 7: OPEN_ENDED */}
      {qType === "OPEN_ENDED" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-rose-800">
              Poin Rubrik Penilaian / Kriteria Jawaban Ideal Siswa
            </label>
            <button
              type="button"
              onClick={handleAddRubricPoint}
              className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Poin</span>
            </button>
          </div>
          <div className="space-y-2">
            {(question.rubric && question.rubric.length > 0
              ? question.rubric
              : ["Menyebutkan konsep dasar dengan tepat", "Memberikan contoh konkret dalam kehidupan"]
            ).map((r, rIdx, arr) => (
              <div key={rIdx} className="flex items-center gap-2 bg-rose-50/50 p-2 rounded-xl border border-rose-200">
                <span className="text-xs font-bold text-rose-700 w-5 text-center">•</span>
                <input
                  type="text"
                  value={r}
                  onChange={(e) => handleRubricChange(rIdx, e.target.value)}
                  placeholder="Kriteria penilaian jawaban..."
                  className="flex-1 p-2 rounded-lg bg-white border border-rose-200 text-xs focus:outline-hidden"
                />
                {arr.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRubricPoint(rIdx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIPE 8: MATH_RESPONSE */}
      {qType === "MATH_RESPONSE" && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-indigo-800">
            Kunci Jawaban Matematika Rigid & Langkah Penyelesaian (Notasi LaTeX / Angka)
          </label>
          <input
            type="text"
            value={question.math_solution || ""}
            onChange={(e) => handleMathSolutionChange(e.target.value)}
            placeholder="Contoh: x = -2 \pm \sqrt{3} atau 42.5 m/s"
            className="w-full p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-300 text-xs font-mono font-bold text-indigo-950 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      )}

      {/* TIPE 9: IMAGE_LABELING */}
      {qType === "IMAGE_LABELING" && (
        <div className="space-y-4 p-4 rounded-2xl bg-fuchsia-50/40 border border-fuchsia-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-fuchsia-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-fuchsia-600" />
              <span>Pengaturan Titik Penanda (Pin) & Label Gambar</span>
            </label>
            <button
              type="button"
              onClick={handleAddLabelTarget}
              className="text-xs font-bold text-fuchsia-700 bg-fuchsia-100 hover:bg-fuchsia-200 px-3 py-1 rounded-lg flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pin</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Konteks / Deskripsi Visual Gambar
              </label>
              <input
                type="text"
                value={question.image_context || ""}
                onChange={(e) => handleImageContextChange(e.target.value)}
                placeholder="Misal: Diagram Struktur Anatomi Bagian Tumbuhan"
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-fuchsia-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                URL Gambar Diagram (Opsional / Kustom)
              </label>
              <input
                type="text"
                value={question.image_url || ""}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://... atau biarkan ilustrasi default"
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-fuchsia-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Interactive Visual Canvas Preview */}
          <div className="relative w-full h-64 bg-slate-900 rounded-2xl overflow-hidden border border-fuchsia-300 shadow-inner flex items-center justify-center select-none">
            {question.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={question.image_url}
                alt="Canvas Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-4 space-y-1">
                <MapPin className="w-8 h-8 text-fuchsia-400 mx-auto animate-bounce" />
                <p className="text-xs font-bold text-white">Area Diagram Visual Interaktif</p>
                <p className="text-[11px] text-fuchsia-200">
                  {question.image_context || "Atur posisi pin penanda di bawah"}
                </p>
              </div>
            )}

            {/* Render Pins */}
            {(question.label_targets || []).map((target, pIdx) => (
              <div
                key={target.id || pIdx}
                style={{ left: `${target.x}%`, top: `${target.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-fuchsia-600 text-white font-bold text-[11px] shadow-lg border-2 border-white animate-pop">
                  <span className="w-4 h-4 rounded-full bg-white text-fuchsia-700 flex items-center justify-center text-[10px]">
                    {pIdx + 1}
                  </span>
                  <span>{target.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pin Configuration Table */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Daftar Pasangan Label ➔ Target Pin ({question.label_targets?.length || 0} Pin)
            </span>
            {(question.label_targets || []).map((target, pIdx) => (
              <div
                key={target.id || pIdx}
                className="p-3 bg-white rounded-xl border border-fuchsia-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
              >
                <div className="sm:col-span-1 font-bold text-fuchsia-700 flex items-center justify-center w-6 h-6 rounded-full bg-fuchsia-100">
                  #{pIdx + 1}
                </div>
                <div className="sm:col-span-4">
                  <span className="text-[10px] text-slate-700 font-bold block">Teks Label Kartu:</span>
                  <input
                    type="text"
                    value={target.label}
                    onChange={(e) => handleUpdateLabelTarget(pIdx, "label", e.target.value)}
                    placeholder="Nama label (cth: Akar)"
                    className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-4">
                  <span className="text-[10px] text-slate-700 font-bold block">Nama Target Area Gambar:</span>
                  <input
                    type="text"
                    value={target.target_name || ""}
                    onChange={(e) => handleUpdateLabelTarget(pIdx, "target_name", e.target.value)}
                    placeholder="Area (cth: Bawah Tanah)"
                    className="w-full p-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <div>
                    <span className="text-[9px] text-slate-700 font-bold block">X%</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={target.x}
                      onChange={(e) => handleUpdateLabelTarget(pIdx, "x", Number(e.target.value))}
                      className="w-12 p-1 border border-slate-200 rounded text-center text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-700 font-bold block">Y%</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={target.y}
                      onChange={(e) => handleUpdateLabelTarget(pIdx, "y", Number(e.target.value))}
                      className="w-12 p-1 border border-slate-200 rounded text-center text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveLabelTarget(pIdx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Hapus Pin"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIPE 10: IMAGE_HOTSPOT */}
      {qType === "IMAGE_HOTSPOT" && (
        <div className="space-y-4 p-4 rounded-2xl bg-orange-50/40 border border-orange-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-orange-600" />
              <span>Pengaturan Hotspot Gambar (Area Sentuh Benar)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Konteks / Deskripsi Gambar Latar Belakang
              </label>
              <input
                type="text"
                value={question.image_context || ""}
                onChange={(e) => handleImageContextChange(e.target.value)}
                placeholder="Misal: Diagram Jantung Manusia"
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                URL Gambar (Opsional / Kustom)
              </label>
              <input
                type="text"
                value={question.image_url || ""}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://... atau gambar default"
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Interactive Hotspot Canvas Preview */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
              handleHotspotChange("x", clickX);
              handleHotspotChange("y", clickY);
            }}
            className="relative w-full h-64 bg-slate-900 rounded-2xl overflow-hidden border border-orange-300 shadow-inner flex items-center justify-center cursor-crosshair select-none"
          >
            {question.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={question.image_url}
                alt="Hotspot Preview"
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="text-center p-4 space-y-1 pointer-events-none">
                <Target className="w-8 h-8 text-orange-400 mx-auto animate-pulse" />
                <p className="text-xs font-bold text-white">Klik di area gambar untuk meletakkan Zona Target</p>
                <p className="text-[11px] text-orange-200">
                  {question.hotspot_zone?.description || "Klik di mana saja pada kotak ini"}
                </p>
              </div>
            )}

            {/* Target Hotspot Circle */}
            {question.hotspot_zone && (
              <div
                style={{
                  left: `${question.hotspot_zone.x}%`,
                  top: `${question.hotspot_zone.y}%`,
                  width: `${question.hotspot_zone.radius * 2}%`,
                  height: `${question.hotspot_zone.radius * 2}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-400 bg-orange-500/30 flex items-center justify-center animate-pulse pointer-events-none"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              </div>
            )}
          </div>

          {/* Hotspot Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-orange-200 text-xs">
            <div>
              <span className="font-semibold text-slate-600 block mb-1">Pusat X / Y Target:</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono bg-orange-50 px-2 py-1 rounded text-orange-800 font-bold">
                  X: {question.hotspot_zone?.x ?? 50}%
                </span>
                <span className="text-[11px] font-mono bg-orange-50 px-2 py-1 rounded text-orange-800 font-bold">
                  Y: {question.hotspot_zone?.y ?? 50}%
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-600">Radius Toleransi:</span>
                <span className="font-bold text-orange-700">{question.hotspot_zone?.radius ?? 15}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                value={question.hotspot_zone?.radius ?? 15}
                onChange={(e) => handleHotspotChange("radius", Number(e.target.value))}
                className="w-full accent-orange-600"
              />
            </div>

            <div>
              <span className="font-semibold text-slate-600 block mb-1">Deskripsi Target Benar:</span>
              <input
                type="text"
                value={question.hotspot_zone?.description || ""}
                onChange={(e) => handleHotspotChange("description", e.target.value)}
                placeholder="Area bilik kiri jantung..."
                className="w-full p-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* TIPE 11: CATEGORIZE_ITEMS */}
      {qType === "CATEGORIZE_ITEMS" && (
        <div className="space-y-4 p-4 rounded-2xl bg-lime-50/40 border border-lime-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-lime-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-lime-600" />
              <span>Pengelompokan (Kategori & Kartu Item)</span>
            </label>
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={(question.categories || []).length >= 4}
              className="text-xs font-bold text-lime-700 bg-lime-100 hover:bg-lime-200 disabled:opacity-40 px-3 py-1 rounded-lg flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori</span>
            </button>
          </div>

          {/* Categories Manager */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Daftar Kelompok Kategori (2 - 4 Kelompok)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(question.categories || ["Kategori A", "Kategori B"]).map((cat, cIdx, arr) => (
                <div
                  key={cIdx}
                  className="flex items-center gap-2 p-2 bg-white rounded-xl border border-lime-300 shadow-xs"
                >
                  <Tag className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                  <input
                    type="text"
                    value={cat}
                    onChange={(e) => handleUpdateCategory(cIdx, e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
                  />
                  {arr.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cIdx)}
                      className="text-slate-400 hover:text-red-500 p-0.5"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Items Manager */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Daftar Kartu Item & Kategori Target ({question.categorize_items?.length || 0} Item)
              </span>
              <button
                type="button"
                onClick={handleAddCategorizeItem}
                className="text-xs font-bold text-lime-700 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {(question.categorize_items || []).map((item, iIdx) => (
                <div
                  key={iIdx}
                  className="p-2.5 bg-white rounded-xl border border-lime-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                >
                  <div className="sm:col-span-1 font-bold text-slate-700 text-center">#{iIdx + 1}</div>
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleUpdateCategorizeItem(iIdx, "text", e.target.value)}
                      placeholder="Teks item (cth: Kucing, Batu)"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={item.category}
                      onChange={(e) => handleUpdateCategorizeItem(iIdx, "category", e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-lime-50/50 text-xs font-bold text-lime-900 focus:outline-hidden"
                    >
                      {(question.categories || ["Kategori A", "Kategori B"]).map((c, cIdx) => (
                        <option key={cIdx} value={c}>
                          Masuk: {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveCategorizeItem(iIdx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Explanation Section with generous vertical margin */}
      <div className="mt-8 pt-6 border-t border-slate-200 space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Penjelasan / Pembahasan Solusi
        </label>
        <input
          type="text"
          value={question.explanation || ""}
          onChange={(e) => handleExplanationChange(e.target.value)}
          placeholder="Berikan penjelasan/alasan solusi agar siswa paham..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 bg-white"
        />
        <p className="text-[11px] font-medium text-slate-600">
          Penjelasan ini akan ditampilkan kepada siswa setelah mereka menyelesaikan kuis atau menjawab soal.
        </p>
      </div>

      {/* Smart Question Conversion Modal */}
      <QuestionConversionModal
        question={question}
        isOpen={isConversionModalOpen}
        onClose={() => setIsConversionModalOpen(false)}
        onApply={(converted) => onUpdate(converted)}
      />

      {/* Smart Options & Distractor Generator Modal */}
      <SmartDistractorModal
        isOpen={isDistractorModalOpen}
        onClose={() => setIsDistractorModalOpen(false)}
        initialQuestionText={question.question_text || ""}
        initialCorrectAnswer={
          currentMcqOptions[question.correct_answer_index ?? 0] || ""
        }
        currentOptionCount={currentMcqOptions.length}
        onApply={(newOptions, newCorrectIdx) => {
          onUpdate({
            ...question,
            options: newOptions,
            correct_answer_index: newCorrectIdx,
          });
        }}
      />

      {/* Question Image Attachment Modal */}
      <ImageAttachmentModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        initialImageUrl={question.image_url}
        initialSourceType={question.image_source_type || "NONE"}
        initialAltText={question.alt_text}
        contextText={question.question_text}
        title={`Lampirkan Aset Gambar Soal #${index + 1}`}
        onApply={handleApplyQuestionImage}
      />

      {/* Option Image Attachment Modal */}
      {activeOptionImageIndex !== null && (
        <ImageAttachmentModal
          isOpen={true}
          onClose={() => setActiveOptionImageIndex(null)}
          initialImageUrl={question.option_items?.[activeOptionImageIndex]?.image_url || ""}
          initialSourceType={question.option_items?.[activeOptionImageIndex]?.image_source_type || "NONE"}
          initialAltText={question.option_items?.[activeOptionImageIndex]?.alt_text || ""}
          contextText={`${question.question_text} (Pilihan ${String.fromCharCode(65 + activeOptionImageIndex)})`}
          title={`Lampirkan Gambar untuk Pilihan ${String.fromCharCode(65 + activeOptionImageIndex)}`}
          onApply={handleApplyOptionImage}
        />
      )}
    </div>
  );
}
