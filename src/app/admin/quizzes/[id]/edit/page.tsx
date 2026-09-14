"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Share2,
  ExternalLink,
  CheckCircle2,
  FileText,
  Check,
  Copy,
  ListOrdered,
} from "lucide-react";
import { ParsedQuestion, QuestionType, Quiz } from "@/lib/types";
import QuestionPreviewCard from "@/components/QuestionPreviewCard";
import EditQuestionModal from "@/components/EditQuestionModal";
import AddQuestionMenu from "@/components/AddQuestionMenu";
import AiGenerateModal from "@/components/AiGenerateModal";
import { createDefaultQuestion } from "@/lib/questionTemplates";

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleSaveQuestionFromModal = (index: number, updated: ParsedQuestion) => {
    const updatedList = [...questions];
    updatedList[index] = updated;
    setQuestions(updatedList);
    setToastMessage(`Soal #${index + 1} berhasil disimpan.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const focusAndScrollToQuestion = (targetIndex: number, message?: string) => {
    setHighlightedIndex(targetIndex);
    if (message) {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 3500);
    }
    setTimeout(() => {
      const el = document.getElementById(`question-card-${targetIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
    setTimeout(() => {
      setHighlightedIndex((prev) => (prev === targetIndex ? null : prev));
    }, 2800);
  };

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/quizzes/${quizId}`);
        const data = await res.json();

        if (res.ok && data.quiz) {
          setQuiz(data.quiz);
          setQuizTitle(data.quiz.title);
          setQuestions(data.questions || []);
        } else {
          alert("Quiz not found.");
          router.push("/admin/quizzes");
        }
      } catch {
        alert("Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [quizId, router]);

  // Question editing handlers
  const handleUpdateQuestion = (index: number, updated: ParsedQuestion) => {
    const updatedList = [...questions];
    updatedList[index] = updated;
    setQuestions(updatedList);
  };

  // Move Up / Down
  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    const updated = [...questions];
    const item = updated.splice(fromIndex, 1)[0];
    updated.splice(toIndex, 0, item);
    setQuestions(updated);
    focusAndScrollToQuestion(toIndex, `Dipindahkan ke Soal #${toIndex + 1}`);
  };

  // Duplicate Question
  const duplicateQuestion = (index: number) => {
    const target = questions[index];
    const cloned: ParsedQuestion = {
      ...target,
      options: [...(target.options || [])],
      correct_answers: target.correct_answers ? [...target.correct_answers] : undefined,
      matching_pairs: target.matching_pairs ? target.matching_pairs.map((p) => ({ ...p })) : undefined,
      reorder_items: target.reorder_items ? [...target.reorder_items] : undefined,
      correct_order: target.correct_order ? [...target.correct_order] : undefined,
      blanks_keywords: target.blanks_keywords ? [...target.blanks_keywords] : undefined,
      question_text: `${target.question_text} (Salinan)`,
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, cloned);
    setQuestions(updated);
    focusAndScrollToQuestion(index + 1, `Disalin sebagai Soal #${index + 2}!`);
  };

  const deleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert("Kuis harus memiliki minimal 1 soal.");
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    setToastMessage(`Soal #${index + 1} dihapus.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddQuestion = (type: QuestionType) => {
    const newQ = createDefaultQuestion(type);
    const newIndex = questions.length;
    setQuestions([...questions, newQ]);
    setEditingQuestionIndex(newIndex);
    setToastMessage(`Soal baru #${newIndex + 1} (${type}) ditambahkan! Silakan edit di modal.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAiGenerated = (newGenerated: ParsedQuestion[]) => {
    if (newGenerated.length === 0) return;
    const startIndex = questions.length;
    setQuestions((prev) => [...prev, ...newGenerated]);
    setIsAiModalOpen(false);
    focusAndScrollToQuestion(startIndex, `${newGenerated.length} soal berhasil dibuat oleh AI!`);
  };

  // Share URL helper
  const shareableUrl = quiz?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/quiz/${quiz.slug}`
    : "";

  const handleCopyLink = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save as Draft (without publishing/opening student share modal)
  const handleSaveDraft = async (isAuto = false) => {
    if (!quizTitle.trim() || questions.length === 0) return;

    if (!isAuto) setSavingDraft(true);

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          questions,
          status: "draft",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save draft.");
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(timeStr);
      setQuiz((prev) => (prev ? { ...prev, status: "draft", title: quizTitle } : prev));

      if (isAuto) {
        setToastMessage(`Auto-saved draft at ${timeStr}`);
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        setToastMessage(`Draft saved successfully at ${timeStr}!`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err: unknown) {
      if (!isAuto) {
        const msg = err instanceof Error ? err.message : "Error saving draft.";
        alert(msg);
      }
    } finally {
      if (!isAuto) setSavingDraft(false);
    }
  };

  // Save & Publish (makes quiz live and opens student share modal)
  const handleSaveAndPublish = async () => {
    if (!quizTitle.trim()) {
      alert("Quiz title cannot be empty.");
      return;
    }

    if (questions.length === 0) {
      alert("Quiz must have at least one question.");
      return;
    }

    setPublishing(true);

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          questions,
          status: "published",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to publish quiz.");
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(timeStr);
      setQuiz((prev) => (prev ? { ...prev, status: "published", title: quizTitle } : prev));
      setShowSuccessModal(true);
      setToastMessage("Quiz published! Share link is live.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error publishing quiz.";
      alert(msg);
    } finally {
      setPublishing(false);
    }
  };

  // Auto-save every 5 minutes (300,000 ms)
  useEffect(() => {
    const timer = setInterval(() => {
      if (quizTitle.trim() && questions.length > 0) {
        handleSaveDraft(true);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(timer);
  }, [quizTitle, questions, quizId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Top Navigation & Action Bar (Sticky below site header) */}
      <div className="sticky top-16 z-30 bg-white py-3.5 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 border-b border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all">
        <div>
          <Link
            href="/admin/quizzes"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline mb-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quizzes Dashboard</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Edit Quiz
            </h1>
            {quiz?.status === "draft" ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Draft Mode
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Published
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium mt-1">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto-save on (every 5m)</span>
            </span>
            {lastSavedTime && (
              <>
                <span>•</span>
                <span className="text-slate-600">Last saved at {lastSavedTime}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Share Button in Header */}
          <button
            onClick={() => setShowSuccessModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-slate-200 transition"
            title="Share Quiz with Students"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span>Share</span>
          </button>

          {/* Preview Button */}
          {quiz?.slug && (
            <Link
              href={`/quiz/${quiz.slug}`}
              target="_blank"
              className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:text-indigo-600 hover:bg-slate-200 transition"
              title="Preview Quiz"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}

          {/* Save Draft Button */}
          <button
            onClick={() => handleSaveDraft(false)}
            disabled={savingDraft || publishing}
            className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-slate-200 disabled:opacity-50 transition"
            title="Save as draft without publishing"
          >
            {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-600" />}
            <span>Save Draft</span>
          </button>

          {/* Save & Publish Button */}
          <button
            onClick={handleSaveAndPublish}
            disabled={savingDraft || publishing}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition shadow-md"
            title="Save and publish live for students"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Save & Publish</span>
          </button>
        </div>
      </div>

      {/* Centered Success & Share Dialog Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-center relative border border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900">Quiz Saved Successfully!</h2>
              <p className="text-sm text-slate-600">
                All changes are now live. Share the updated link below with your students.
              </p>
            </div>

            {/* Shareable Link Box */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Shareable Student Link
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-slate-800 font-mono focus:outline-hidden truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shrink-0 shadow-xs ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => router.push(`/quiz/${quiz?.slug}`)}
                className="w-full py-3.5 px-4 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Play / Test Quiz</span>
              </button>

              <button
                onClick={() => router.push("/admin/quizzes")}
                className="w-full py-3.5 px-4 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition"
              >
                <FileText className="w-4 h-4" />
                <span>Quiz Dashboard</span>
              </button>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="text-xs text-slate-700 hover:text-slate-900 font-semibold underline block mx-auto pt-1"
            >
              Close & Keep Editing
            </button>
          </div>
        </div>
      )}

      {/* Main Layout with Sticky Number Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        {/* Main Editor Column */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* Mobile Horizontal Quick Jump Bar */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto py-2.5 px-3 bg-slate-100/80 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800 shrink-0">Edit Soal:</span>
            <div className="flex items-center gap-1.5">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setEditingQuestionIndex(idx)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold shrink-0 transition border ${
                    highlightedIndex === idx || editingQuestionIndex === idx
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-800 border-slate-300 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                  title={`Klik untuk Edit Soal #${idx + 1}`}
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Judul Kuis
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              className="w-full text-2xl font-bold text-slate-900 border-b border-slate-300 pb-1 focus:border-indigo-600 focus:outline-hidden"
              placeholder="Quiz Title..."
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-800 font-bold">
            <div className="flex items-center gap-2">
              <span>Daftar Soal ({questions.length})</span>
              <span className="text-xs text-slate-500 font-normal">
                (Klik &quot;Edit Soal&quot; untuk menyunting secara terfokus)
              </span>
            </div>
          </div>

          {/* Question Cards in Clean Preview Mode */}
          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <QuestionPreviewCard
                key={qIndex}
                question={q}
                index={qIndex}
                totalQuestions={questions.length}
                isHighlighted={highlightedIndex === qIndex}
                onEdit={() => setEditingQuestionIndex(qIndex)}
                onMoveUp={() => moveQuestion(qIndex, qIndex - 1)}
                onMoveDown={() => moveQuestion(qIndex, qIndex + 1)}
                onDuplicate={() => duplicateQuestion(qIndex)}
                onDelete={() => deleteQuestion(qIndex)}
              />
            ))}
          </div>

          {/* Add Question Menu Bar */}
          <AddQuestionMenu
            onAddType={handleAddQuestion}
            onOpenAiModal={() => setIsAiModalOpen(true)}
          />

          {/* Bottom Save Bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSuccessModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-slate-200 transition"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Share Quiz Link</span>
              </button>
              <span className="text-xs text-slate-700 font-medium hidden sm:inline">
                {lastSavedTime ? `Last saved at ${lastSavedTime}` : "Auto-save active (5m)"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleSaveDraft(false)}
                disabled={savingDraft || publishing}
                className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-1.5 hover:bg-slate-200 disabled:opacity-50 transition"
              >
                {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-600" />}
                <span>Save Draft</span>
              </button>

              <button
                onClick={handleSaveAndPublish}
                disabled={savingDraft || publishing}
                className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 disabled:opacity-50 transition flex items-center gap-2"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save & Publish</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Question Quick-Jump Sidebar (Desktop) */}
        <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-36 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ListOrdered className="w-4 h-4 text-indigo-600" />
              <span>Daftar Soal</span>
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {questions.length} Soal
            </span>
          </div>
          <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
            Klik nomor untuk membuka modal edit soal terfokus:
          </p>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {questions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setEditingQuestionIndex(idx)}
                className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center transition shadow-2xs border ${
                  highlightedIndex === idx || editingQuestionIndex === idx
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300 scale-105"
                    : "bg-slate-50 text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border-slate-200"
                }`}
                title={`Edit Soal #${idx + 1}: ${q.question_type || "MULTIPLE_CHOICE"}`}
              >
                #{idx + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* Dedicated Question Edit Modal */}
      {editingQuestionIndex !== null && questions[editingQuestionIndex] && (
        <EditQuestionModal
          isOpen={true}
          question={questions[editingQuestionIndex]}
          index={editingQuestionIndex}
          totalQuestions={questions.length}
          onClose={() => setEditingQuestionIndex(null)}
          onSave={handleSaveQuestionFromModal}
        />
      )}

      {/* AI Generator Modal */}
      <AiGenerateModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerated={handleAiGenerated}
      />

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 backdrop-blur-xs transition-all animate-bounce">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-sm font-semibold tracking-wide">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
