"use client";

import React, { useState, useEffect } from "react";
import { X, Check, ArrowLeft, Edit3 } from "lucide-react";
import { ParsedQuestion } from "@/lib/types";
import QuestionCardEditor from "@/components/QuestionCardEditor";

interface EditQuestionModalProps {
  isOpen: boolean;
  question: ParsedQuestion;
  index: number;
  totalQuestions: number;
  onClose: () => void;
  onSave: (index: number, updated: ParsedQuestion) => void;
}

export default function EditQuestionModal({
  isOpen,
  question,
  index,
  totalQuestions,
  onClose,
  onSave,
}: EditQuestionModalProps) {
  // Local deep-clone draft to guarantee full revert if user cancels
  const [draft, setDraft] = useState<ParsedQuestion>(() =>
    question ? JSON.parse(JSON.stringify(question)) : ({} as ParsedQuestion)
  );

  useEffect(() => {
    if (isOpen && question) {
      setDraft(JSON.parse(JSON.stringify(question)));
    }
  }, [isOpen, question]);

  if (!isOpen || !question) return null;

  const handleSave = () => {
    onSave(index, draft);
    onClose();
  };

  const handleCancel = () => {
    // Revert simply by discarding draft and closing
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-pop border border-slate-100 my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Edit Soal #{index + 1}
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Fokus Penuh
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Perubahan hanya tersimpan jika Anda klik &quot;Simpan Perubahan&quot;. Klik Batal untuk mengembalikan ke kondisi semula.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            title="Tutup tanpa menyimpan (Batal)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Editor Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          <QuestionCardEditor
            question={draft}
            index={index}
            totalQuestions={totalQuestions}
            isModalMode={true}
            onUpdate={(updated) => setDraft(updated)}
          />
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70 rounded-b-3xl">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Batal &amp; Kembalikan</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 flex items-center gap-2 transition"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
