"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Copy,
  ExternalLink,
  Sparkles,
  Save,
  Check,
  Key,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Settings,
} from "lucide-react";
import { ParsedQuestion, QuestionType } from "@/lib/types";
import SettingsModal from "@/components/SettingsModal";
import AiGenerateModal from "@/components/AiGenerateModal";
import QuestionPreviewCard from "@/components/QuestionPreviewCard";
import EditQuestionModal from "@/components/EditQuestionModal";
import AddQuestionMenu from "@/components/AddQuestionMenu";
import { createDefaultQuestion } from "@/lib/questionTemplates";
import { reportClientError } from "@/components/ErrorTelemetry";
import { safeParseResponseJson } from "@/lib/apiResponse";

export default function CreateQuizPage() {
  const router = useRouter();

  // State
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseDiagnostics, setParseDiagnostics] = useState<{
    hasDigitalText: boolean;
    charCount: number;
    pageCount: number;
    keysTested: number;
    triedLog: string[];
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Parsed Quiz Data
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleSaveQuestionFromModal = (index: number, updated: ParsedQuestion) => {
    const copy = [...questions];
    copy[index] = updated;
    setQuestions(copy);
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
        const textarea = el.querySelector("textarea");
        textarea?.focus();
      }
    }, 80);
    setTimeout(() => {
      setHighlightedIndex((prev) => (prev === targetIndex ? null : prev));
    }, 2800);
  };

  // Check for auto-saved draft on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("quizcaplos_create_draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.questions?.length > 0) {
            setHasSavedDraft(true);
          }
        } catch {}
      }
    }
  }, []);

  // Auto-save draft when questions change
  useEffect(() => {
    if (typeof window !== "undefined" && questions.length > 0 && !publishedSlug) {
      localStorage.setItem(
        "quizcaplos_create_draft",
        JSON.stringify({ title: quizTitle, questions })
      );
    }
  }, [questions, quizTitle, publishedSlug]);

  const handleRestoreDraft = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("quizcaplos_create_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        setQuizTitle(parsed.title || "");
        setQuestions(parsed.questions || []);
        setHasSavedDraft(false);
      }
    }
  };

  const handleDiscardDraft = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("quizcaplos_create_draft");
      setHasSavedDraft(false);
    }
  };

  // File selection handler
  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setParseError("Silakan pilih berkas PDF yang valid.");
      return;
    }
    // Check file size (max 4.5 MB on Vercel Serverless)
    if (selectedFile.size > 4.5 * 1024 * 1024) {
      setParseError(
        `Ukuran file PDF terlalu besar (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB). Batas maksimum serverless adalah 4.5 MB untuk mencegah server timeout. Silakan kompres atau perkecil PDF Anda terlebih dahulu.`
      );
      return;
    }
    setFile(selectedFile);
    setParseError(null);
  };

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Submit PDF to /api/parse-pdf
  const handleParsePDF = async () => {
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      setParseError(
        `Ukuran file PDF (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas 4.5 MB serverless. Silakan kompres PDF terlebih dahulu.`
      );
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setParseDiagnostics(null);

    const customApiKey = typeof window !== "undefined" ? localStorage.getItem("quizcaplos_gemini_api_key") || "" : "";
    let customModel = typeof window !== "undefined" ? localStorage.getItem("quizcaplos_gemini_model") || "gemini-2.0-flash" : "gemini-2.0-flash";
    if (
      customModel.includes("3.6") ||
      customModel.includes("2.5") ||
      customModel.includes("exp") ||
      customModel === "gemini-3.6-flash" ||
      customModel === "gemini-2.5-flash" ||
      customModel === "gemini-2.5-pro" ||
      customModel === "gemini-2.0-flash-exp" ||
      customModel === "gemini-1.5-flash-latest" ||
      customModel === "gemini-1.5-pro-latest"
    ) {
      customModel = "gemini-2.0-flash";
      if (typeof window !== "undefined") {
        localStorage.setItem("quizcaplos_gemini_model", "gemini-2.0-flash");
      }
    }

    const customOcrKey = typeof window !== "undefined" ? localStorage.getItem("quizcaplos_ocrspace_key") || "" : "";

    const formData = new FormData();
    formData.append("file", file);
    if (customApiKey) {
      formData.append("api_key", customApiKey);
    }
    if (customModel) {
      formData.append("model", customModel);
    }
    if (customOcrKey) {
      formData.append("ocr_api_key", customOcrKey);
    }

    try {
      const headers: Record<string, string> = {};
      if (customApiKey) {
        headers["x-gemini-api-key"] = customApiKey;
      }
      if (customModel) {
        headers["x-gemini-model"] = customModel;
      }
      if (customOcrKey) {
        headers["x-ocrspace-api-key"] = customOcrKey;
      }

      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        headers,
        body: formData,
      });

      const parsedResult = await safeParseResponseJson(res);

      if (!parsedResult.ok || !parsedResult.data) {
        if (parsedResult.data?.diagnostics) {
          setParseDiagnostics(parsedResult.data.diagnostics);
        }
        const errorText = parsedResult.error || "Gagal memproses dokumen PDF.";
        if (
          errorText.includes("API Key is missing") ||
          errorText.includes("GEMINI_API_KEY") ||
          errorText.includes("API Key Gemini Anda tidak valid")
        ) {
          setIsSettingsOpen(true);
        }
        throw new Error(errorText);
      }

      const data = parsedResult.data;

      setQuizTitle(data.title || file.name.replace(/\.[^/.]+$/, ""));
      const extractedQuestions = data.questions || [];
      setQuestions(extractedQuestions);

      const fillInCount = extractedQuestions.filter((q: any) => q.question_type === "FILL_IN_THE_BLANKS").length;
      const mcqCount = extractedQuestions.filter((q: any) => !q.question_type || q.question_type === "MULTIPLE_CHOICE").length;
      const otherCount = extractedQuestions.length - fillInCount - mcqCount;
      const typeSummary: string[] = [];
      if (fillInCount > 0) typeSummary.push(`${fillInCount} isian`);
      if (mcqCount > 0) typeSummary.push(`${mcqCount} pilihan ganda`);
      if (otherCount > 0) typeSummary.push(`${otherCount} tipe lainnya`);

      const imgCount = extractedQuestions.filter((q: any) => !!q.image_url).length;
      const optImgCount = extractedQuestions.reduce(
        (acc: number, q: any) => acc + (q.option_items?.filter((oi: any) => !!oi.image_url).length || 0),
        0
      );
      const imgSummary: string[] = [];
      if (imgCount > 0) imgSummary.push(`${imgCount} diagram`);
      if (optImgCount > 0) imgSummary.push(`${optImgCount} gambar opsi`);

      const extraInfo = [typeSummary.join(", "), imgSummary.join(", ")].filter(Boolean).join(" | ");
      setToastMessage(
        `✨ Berhasil mengekstrak ${extractedQuestions.length} butir soal${extraInfo ? ` (${extraInfo})` : ""}!`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error parsing PDF.";
      setParseError(msg);
      reportClientError("PDF OCR Parsing Error", err, { filename: file.name, fileSize: file.size });
    } finally {
      setIsParsing(false);
    }
  };

  // Question manipulation handlers
  const updateQuestionText = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].question_text = text;
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = text;
    setQuestions(updated);
  };

  const setCorrectAnswer = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    updated[qIndex].correct_answer_index = oIndex;
    setQuestions(updated);
  };

  const updateExplanation = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].explanation = text;
    setQuestions(updated);
  };

  const removeImage = (index: number) => {
    const updated = [...questions];
    updated[index].image_url = null;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    const newOptLetter = String.fromCharCode(65 + updated[qIndex].options.length);
    updated[qIndex].options.push(`Option ${newOptLetter}`);
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    updated[qIndex].options.splice(oIndex, 1);
    if (updated[qIndex].correct_answer_index >= updated[qIndex].options.length) {
      updated[qIndex].correct_answer_index = 0;
    }
    setQuestions(updated);
  };

  const handleAddQuestionType = (type: QuestionType) => {
    const newIndex = questions.length;
    const newQ = createDefaultQuestion(type);
    setQuestions([...questions, newQ]);
    setEditingQuestionIndex(newIndex);
    setToastMessage(`Soal baru #${newIndex + 1} (${type.replace(/_/g, " ")}) ditambahkan! Silakan edit di modal.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateQuestion = (index: number, updated: ParsedQuestion) => {
    const copy = [...questions];
    copy[index] = updated;
    setQuestions(copy);
  };

  const handleAiQuestionsGenerated = (newQuestions: ParsedQuestion[], title?: string) => {
    if (title && !quizTitle) setQuizTitle(title);
    const startIdx = questions.length;
    setQuestions((prev) => [...prev, ...newQuestions]);
    focusAndScrollToQuestion(startIdx, `${newQuestions.length} butir soal berhasil dibuat oleh AI!`);
  };

  const handleCreateBlankQuiz = () => {
    setQuizTitle("New Custom Quiz");
    const firstQ = createDefaultQuestion("MULTIPLE_CHOICE");
    setQuestions([firstQ]);
    focusAndScrollToQuestion(0, "Blank quiz started! Edit Question #1 below.");
  };

  const deleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    setToastMessage(`Question #${index + 1} deleted.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Move Question Up/Down
  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    const updated = [...questions];
    const item = updated.splice(fromIndex, 1)[0];
    updated.splice(toIndex, 0, item);
    setQuestions(updated);
    focusAndScrollToQuestion(toIndex, `Moved to Question #${toIndex + 1}`);
  };

  // Duplicate Question
  const duplicateQuestion = (index: number) => {
    const target = questions[index];
    const cloned: ParsedQuestion = {
      ...target,
      options: [...target.options],
      question_text: `${target.question_text} (Copy)`,
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, cloned);
    setQuestions(updated);
    focusAndScrollToQuestion(index + 1, `Duplicated as Question #${index + 2}!`);
  };

  // Save Draft (saves to backend as draft, without opening share modal)
  const handleSaveDraft = async (isAuto = false) => {
    if (!quizTitle.trim() || questions.length === 0) return;

    if (!isAuto) setSavingDraft(true);

    try {
      let res;
      if (createdQuizId) {
        res = await fetch(`/api/quizzes/${createdQuizId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: quizTitle,
            questions,
            status: "draft",
          }),
        });
      } else {
        res = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: quizTitle,
            questions,
            status: "draft",
          }),
        });
      }

      const parsedRes = await safeParseResponseJson(res);
      if (!parsedRes.ok || !parsedRes.data) {
        throw new Error(parsedRes.error || "Failed to save draft.");
      }
      const data = parsedRes.data;

      if (data.quiz?.id) {
        setCreatedQuizId(data.quiz.id);
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(timeStr);

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

  // Save & Publish Quiz
  const handlePublishQuiz = async () => {
    if (!quizTitle.trim()) {
      alert("Please provide a title for the quiz.");
      return;
    }

    if (questions.length === 0) {
      alert("Please add at least one question to publish.");
      return;
    }

    setIsSaving(true);

    try {
      let res;
      if (createdQuizId) {
        res = await fetch(`/api/quizzes/${createdQuizId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: quizTitle,
            questions,
            status: "published",
          }),
        });
      } else {
        res = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: quizTitle,
            questions,
            status: "published",
          }),
        });
      }

      const parsedRes = await safeParseResponseJson(res);
      if (!parsedRes.ok || !parsedRes.data) {
        throw new Error(parsedRes.error || "Failed to publish quiz.");
      }
      const data = parsedRes.data;

      if (data.quiz?.id) {
        setCreatedQuizId(data.quiz.id);
      }
      if (data.quiz?.slug) {
        setPublishedSlug(data.quiz.slug);
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(timeStr);

      if (typeof window !== "undefined") {
        localStorage.removeItem("quizcaplos_create_draft");
      }
      setToastMessage("Quiz published! Share link is live.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error publishing quiz.";
      reportClientError("Quiz Publishing Error", err, { title: quizTitle, questionCount: questions.length });
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save timer every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      if (quizTitle.trim() && questions.length > 0) {
        handleSaveDraft(true);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(timer);
  }, [quizTitle, questions, createdQuizId]);

  const shareableUrl = publishedSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/quiz/${publishedSlug}`
    : "";

  const handleCopyLink = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-indigo-600" />
            <span>Create Quiz from PDF OCR</span>
          </h1>
          <p className="text-slate-600 mt-1">
            Upload a scanned exam PDF. Gemini Vision will transcribe the questions and prepare an interactive quiz.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-save every 5m {lastSavedTime ? `(Saved at ${lastSavedTime})` : ""}</span>
          </span>

          <button
            onClick={() => handleSaveDraft(false)}
            disabled={savingDraft || isSaving || questions.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-200 disabled:opacity-50 transition"
            title="Save as draft without publishing"
          >
            {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-600" />}
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-200 transition shrink-0"
          >
            <Key className="w-4 h-4 text-indigo-600" />
            <span>Set Gemini API Key</span>
          </button>
        </div>
      </div>

      {/* Published Success Dialog Modal (Centered Popup, no scrolling needed!) */}
      {publishedSlug && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-pop">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-center relative border border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900">Quiz Published Successfully!</h2>
              <p className="text-sm text-slate-600">
                Your interactive quiz is now live and ready for students to join.
              </p>
            </div>

            {/* Shareable Link Box */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
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
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm ${
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
                onClick={() => router.push(`/quiz/${publishedSlug}`)}
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
              onClick={() => setPublishedSlug(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline block mx-auto pt-1"
            >
              Close & Keep Editing
            </button>
          </div>
        </div>
      )}

      {/* Restore Unsaved Draft Banner */}
      {hasSavedDraft && questions.length === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pop text-amber-900 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <span>You have an unsaved quiz draft from a previous session.</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRestoreDraft}
              className="px-4 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition"
            >
              Restore Draft
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 font-semibold text-xs hover:bg-amber-100 transition"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* PDF Upload Section */}
      {questions.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 shadow-xs space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`p-8 text-center rounded-xl transition cursor-pointer ${
              isDragOver ? "bg-indigo-50 border-indigo-400" : "bg-slate-50 hover:bg-slate-100"
            }`}
            onClick={() => document.getElementById("pdf-input")?.click()}
          >
            <input
              id="pdf-input"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />

            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">
              {file ? file.name : "Drag & Drop your scanned PDF exam here"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              or click to browse from your computer (PDF up to 20MB)
            </p>
          </div>

          {parseError && (
            <div className="p-4 bg-red-50/90 border border-red-200 rounded-2xl space-y-3 text-red-800 text-sm shadow-xs animate-pop">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-red-900 text-sm">Gagal Mengekstrak Soal dari PDF</h4>
                  <p className="text-xs text-red-700 leading-relaxed break-words">{parseError}</p>
                </div>
              </div>

              {parseDiagnostics && (
                <div className="p-3 bg-white/90 border border-red-200/90 rounded-xl text-xs space-y-1.5 text-slate-700 shadow-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🔍 Hasil Diagnostik Ekstraksi:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">• Status Dokumen:</span>
                      <span className="font-bold text-slate-800">
                        {parseDiagnostics.hasDigitalText
                          ? `Teks Digital Terdeteksi (${parseDiagnostics.charCount} karakter, ${parseDiagnostics.pageCount} halaman)`
                          : "Dokumen Scan/Foto (Tidak ada teks digital)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">• API Key Diuji:</span>
                      <span className="font-bold text-slate-800">{parseDiagnostics.keysTested} key aktif</span>
                    </div>
                  </div>
                  {parseDiagnostics.triedLog && parseDiagnostics.triedLog.length > 0 && (
                    <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80 max-h-24 overflow-y-auto space-y-0.5 mt-1">
                      <div className="font-bold text-slate-700">Riwayat Model yang Dicoba:</div>
                      {parseDiagnostics.triedLog.map((log: string, idx: number) => (
                        <div key={idx} className="truncate">• {log}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-200/60">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Pengaturan API Key & Model</span>
                </button>

                {file && (
                  <button
                    type="button"
                    onClick={handleParsePDF}
                    disabled={isParsing}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-red-300 hover:bg-red-100 text-red-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Coba Ekstrak Ulang</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setParseError(null);
                    setQuestions([
                      {
                        question_text: "",
                        question_type: "MULTIPLE_CHOICE",
                        options: ["", "", "", ""],
                        correct_answer_index: 0,
                        explanation: "",
                      },
                    ]);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Tulis Soal Secara Manual
                </button>
              </div>
            </div>
          )}

          {file && (
            <div className="flex justify-end">
              <button
                onClick={handleParsePDF}
                disabled={isParsing}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition shadow-md"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Parsing PDF with Gemini Vision OCR...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>Start OCR Question Extraction</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* OR Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="shrink mx-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              OR CREATE MANUALLY
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Manual Quiz Creation Card */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">Tidak punya dokumen PDF soal?</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                Anda dapat membuat soal secara manual dari nol atau biarkan AI Gemini membuatkan paket soal interaktif 8 tipe lengkap secara otomatis.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleCreateBlankQuiz}
                className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-slate-800 transition inline-flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kuis Kosong Manual</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm rounded-xl hover:from-indigo-700 hover:to-purple-700 transition inline-flex items-center gap-2 shadow-md shadow-indigo-100"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Buat dengan AI (Gemini)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Review Dashboard */}
      {questions.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quiz Title
                </label>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-save every 5m {lastSavedTime ? `(Saved at ${lastSavedTime})` : ""}</span>
                </span>
              </div>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full text-2xl font-bold text-slate-900 border-b border-slate-300 pb-1 focus:border-indigo-600 focus:outline-hidden"
                placeholder="Enter Quiz Title..."
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Save Draft Button */}
              <button
                type="button"
                onClick={() => handleSaveDraft(false)}
                disabled={savingDraft || isSaving}
                className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-slate-200 disabled:opacity-50 transition"
                title="Save as draft without publishing"
              >
                {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-600" />}
                <span>Save Draft</span>
              </button>

              {/* Save & Publish Button */}
              <button
                type="button"
                onClick={handlePublishQuiz}
                disabled={savingDraft || isSaving}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition shadow-md"
                title="Save and publish live for students"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Save & Publish Quiz</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 font-semibold">
            <span>Questions ({questions.length})</span>
            <AddQuestionMenu
              onAddType={handleAddQuestionType}
              onOpenAiModal={() => setIsAiModalOpen(true)}
              variant="top"
            />
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

          {/* Quick Add Question Bar */}
          <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">
              Tambah butir soal baru atau minta AI membuatkan soal:
            </span>
            <AddQuestionMenu
              onAddType={handleAddQuestionType}
              onOpenAiModal={() => setIsAiModalOpen(true)}
              variant="bottom"
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => {
                if (confirm("Reset and upload a new PDF?")) {
                  setQuestions([]);
                  setFile(null);
                  setPublishedSlug(null);
                  setCreatedQuizId(null);
                }
              }}
              className="px-4 py-2 text-slate-500 font-semibold text-sm hover:text-slate-800 transition text-left"
            >
              Upload Different PDF
            </button>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleSaveDraft(false)}
                disabled={savingDraft || isSaving}
                className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-1.5 hover:bg-slate-200 disabled:opacity-50 transition"
              >
                {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-600" />}
                <span>Save Draft</span>
              </button>

              <button
                onClick={handlePublishQuiz}
                disabled={savingDraft || isSaving}
                className="px-7 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                <span>Save & Publish Quiz</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 backdrop-blur-xs transition-all animate-bounce">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-sm font-semibold tracking-wide">{toastMessage}</span>
        </div>
      )}

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

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AiGenerateModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerated={handleAiQuestionsGenerated}
      />
    </div>
  );
}
