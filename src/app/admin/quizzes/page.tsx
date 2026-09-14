"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Quiz } from "@/lib/types";
import {
  FileText,
  BarChart3,
  Copy,
  ExternalLink,
  Plus,
  Loader2,
  Calendar,
  Check,
  Edit,
  Trash2,
  Users,
} from "lucide-react";

export default function AdminQuizzesListPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const [quizRes, subsRes] = await Promise.all([
          fetch("/api/quizzes"),
          fetch("/api/submit-quiz"),
        ]);

        const quizData = await quizRes.json();
        const subsData = await subsRes.json();

        if (quizData?.quizzes) {
          setQuizzes(quizData.quizzes);
        }

        if (subsData?.submissions) {
          const counts: Record<string, number> = {};
          for (const s of subsData.submissions) {
            counts[s.quiz_id] = (counts[s.quiz_id] || 0) + 1;
          }
          setSubmissionCounts(counts);
        }
      } catch (err) {
        console.error("Error loading quizzes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchQuizzes();
  }, []);

  const handleCopy = (slug: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/quiz/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteQuiz = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? All questions and student submissions will be permanently deleted.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
      } else {
        alert("Failed to delete quiz.");
      }
    } catch {
      alert("Error deleting quiz.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Teacher Quiz Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Manage created quizzes, edit questions, inspect student scores, or copy shareable links.
          </p>
        </div>

        <Link
          href="/admin/create"
          className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-2 hover:bg-indigo-700 transition shadow-md shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Quiz</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
          <FileText className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">No Quizzes Created Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Upload your first scanned PDF exam sheet to automatically generate an interactive quiz.
          </p>
          <Link
            href="/admin/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quiz Now</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((q) => {
            const count = submissionCounts[q.id] || 0;

            return (
              <div
                key={q.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">
                      {q.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      <span>{count} Submissions</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {q.status === "draft" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Published
                      </span>
                    )}
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(q.created_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopy(q.slug, q.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition"
                  >
                    {copiedId === q.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Edit Quiz */}
                    <Link
                      href={`/admin/quizzes/${q.id}/edit`}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Edit Quiz Questions"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>

                    {/* Preview Quiz */}
                    <Link
                      href={`/quiz/${q.slug}`}
                      target="_blank"
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Preview Quiz as Student"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    {/* View Results */}
                    <Link
                      href={`/admin/quizzes/${q.id}/results`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Results</span>
                    </Link>

                    {/* Delete Quiz */}
                    <button
                      onClick={() => handleDeleteQuiz(q.id, q.title)}
                      disabled={deletingId === q.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
