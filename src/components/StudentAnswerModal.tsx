"use client";

import { Submission } from "@/lib/types";
import { X, CheckCircle, XCircle, Award, User, Calendar, Check, HelpCircle } from "lucide-react";

interface StudentAnswerModalProps {
  submission: Submission | null;
  onClose: () => void;
}

export default function StudentAnswerModal({ submission, onClose }: StudentAnswerModalProps) {
  if (!submission) return null;

  const accuracy =
    submission.total_questions > 0
      ? Math.round((submission.score / submission.total_questions) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-pop border border-slate-100 my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{submission.student_name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(submission.completed_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Banner */}
        <div className="px-6 py-4 bg-indigo-50/50 border-b border-indigo-100/60 flex items-center justify-around shrink-0 text-center">
          <div>
            <span className="block text-xs font-bold uppercase text-slate-500">Score</span>
            <span className="text-2xl font-black text-indigo-600">
              {submission.score} / {submission.total_questions}
            </span>
          </div>

          <div className="w-px h-8 bg-indigo-200" />

          <div>
            <span className="block text-xs font-bold uppercase text-slate-500">Accuracy</span>
            <span
              className={`text-2xl font-black ${
                accuracy >= 75
                  ? "text-emerald-600"
                  : accuracy >= 50
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {accuracy}%
            </span>
          </div>
        </div>

        {/* Question by Question Answer Details */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Student Answer Breakdown ({submission.answers?.length || 0} Questions)
          </h3>

          {!submission.answers || submission.answers.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4 text-center">
              No detailed answer breakdown recorded for this submission.
            </p>
          ) : (
            submission.answers.map((ans, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition ${
                  ans.is_correct
                    ? "bg-emerald-50/40 border-emerald-200"
                    : "bg-red-50/40 border-red-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-bold text-xs uppercase px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    Question #{idx + 1}
                  </span>
                  {ans.is_correct ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-900 mb-3">{ans.question_text}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="block text-slate-400 font-bold uppercase text-[10px]">
                      Student Answer
                    </span>
                    <span className={`font-bold ${ans.is_correct ? "text-emerald-700" : "text-red-700"}`}>
                      {ans.selected_index !== undefined
                        ? `Option ${String.fromCharCode(65 + ans.selected_index)}`
                        : ans.selected_indices
                        ? `Options ${ans.selected_indices.map((i) => String.fromCharCode(65 + i)).join(", ")}`
                        : ans.user_matches
                        ? `${Object.entries(ans.user_matches).map(([k, v]) => `${k} ➔ ${v}`).join("; ")}`
                        : ans.user_label_matches
                        ? `${Object.entries(ans.user_label_matches).map(([pin, lbl]) => `${pin}: ${lbl}`).join(", ")}`
                        : ans.user_hotspot_coords
                        ? `Titik (${ans.user_hotspot_coords.x}%, ${ans.user_hotspot_coords.y}%)`
                        : ans.user_categorization
                        ? `${Object.entries(ans.user_categorization).map(([cat, items]) => `${cat}: [${items.join(", ")}]`).join("; ")}`
                        : ans.user_order
                        ? `Urutan: ${ans.user_order.join(" ➔ ")}`
                        : ans.user_text || "-"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="block text-slate-400 font-bold uppercase text-[10px]">
                      Correct Answer Key / Status
                    </span>
                    <span className="font-bold text-emerald-700">
                      {ans.correct_index !== undefined
                        ? `Option ${String.fromCharCode(65 + ans.correct_index)}`
                        : ans.is_correct
                        ? "Sesuai Kunci Jawaban"
                        : "Perlu Evaluasi"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
