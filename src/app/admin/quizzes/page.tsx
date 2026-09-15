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
  Sparkles,
} from "lucide-react";

export default function AdminQuizzesListPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

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

  const handleToggleStatus = async (quizId: string, currentStatus: "draft" | "published") => {
    const newStatus = currentStatus === "draft" ? "published" : "draft";
    setUpdatingStatusId(quizId);
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setQuizzes((prev) =>
          prev.map((q) => (q.id === quizId ? { ...q, status: newStatus } : q))
        );
      } else {
        alert("Gagal memperbarui status kuis.");
      }
    } catch (err) {
      console.error("Error toggling status:", err);
      alert("Terjadi kesalahan saat memperbarui status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-caplos-navy tracking-tight">
              Dashboard Kuis Guru
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-caplos-blue-50 text-caplos-blue border border-caplos-blue-200">
              Caplos
            </span>
          </div>
          <p className="text-caplos-navy-600 mt-1 text-sm font-medium">
            Kelola kuis, edit butir soal, salin link tugas siswa, dan pantau rekap nilai.
          </p>
        </div>

        <Link
          href="/admin/create"
          className="px-5 py-3 rounded-2xl bg-caplos-blue text-white font-bold flex items-center gap-2 hover:bg-caplos-blue-600 transition shadow-md shadow-caplos-blue/20 shrink-0"
        >
          <Plus className="w-5 h-5 text-caplos-yellow" />
          <span>Buat Kuis Baru</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-caplos-blue animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-caplos-blue-50 text-caplos-blue flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-caplos-navy">Belum Ada Kuis yang Dibuat</h3>
          <p className="text-sm text-caplos-navy-600 max-w-sm mx-auto">
            Unggah lembar ujian PDF pertama Anda untuk mengekstrak soal otomatis dengan AI Caplos.
          </p>
          <Link
            href="/admin/create"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-caplos-blue text-white font-bold hover:bg-caplos-blue-600 transition shadow-md shadow-caplos-blue/20"
          >
            <Plus className="w-4 h-4 text-caplos-yellow" />
            <span>Mulai Buat Kuis Sekarang</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((q) => {
            const count = submissionCounts[q.id] || 0;

            return (
              <div
                key={q.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-caplos-navy leading-snug">
                      {q.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-caplos-blue bg-caplos-blue-50 px-2.5 py-1 rounded-full shrink-0 border border-caplos-blue-100">
                      <Users className="w-3.5 h-3.5" />
                      <span>{count} Siswa</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {q.status === "draft" ? (
                      <button
                        onClick={() => handleToggleStatus(q.id, "draft")}
                        disabled={updatingStatusId === q.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-caplos-yellow/20 hover:bg-caplos-yellow/30 text-caplos-navy border border-caplos-yellow/60 transition cursor-pointer"
                        title="Klik untuk mempublikasikan kuis agar siswa dapat mengerjakan"
                      >
                        {updatingStatusId === q.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-caplos-yellow-700" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-caplos-yellow-600 animate-pulse" />
                        )}
                        <span>Draft (Klik untuk Publish)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(q.id, "published")}
                        disabled={updatingStatusId === q.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition cursor-pointer"
                        title="Kuis ini sedang aktif untuk siswa. Klik untuk mengembalikan ke status Draft"
                      >
                        {updatingStatusId === q.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                        <span>Published (Aktif)</span>
                      </button>
                    )}
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(q.created_at).toLocaleDateString("id-ID")}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(q.slug, q.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-caplos-navy text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition cursor-pointer"
                    >
                      {copiedId === q.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin Link</span>
                        </>
                      )}
                    </button>

                    {q.status === "draft" && (
                      <button
                        onClick={() => handleToggleStatus(q.id, "draft")}
                        disabled={updatingStatusId === q.id}
                        className="px-3 py-1.5 rounded-xl bg-caplos-blue hover:bg-caplos-blue-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                        title="Publikasikan kuis agar siswa melihat versi resmi (bukan Teacher Preview)"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-caplos-yellow" />
                        <span>Publikasikan</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Edit Quiz */}
                    <Link
                      href={`/admin/quizzes/${q.id}/edit`}
                      className="p-2 rounded-xl text-slate-500 hover:text-caplos-blue hover:bg-caplos-blue-50 transition"
                      title="Edit Soal Kuis"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>

                    {/* Preview Quiz */}
                    <Link
                      href={`/quiz/${q.slug}`}
                      target="_blank"
                      className="p-2 rounded-xl text-slate-500 hover:text-caplos-blue hover:bg-caplos-blue-50 transition"
                      title="Pratinjau Kuis Sebagai Siswa"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    {/* View Results */}
                    <Link
                      href={`/admin/quizzes/${q.id}/results`}
                      className="px-3 py-1.5 rounded-xl bg-caplos-blue-50 text-caplos-blue text-xs font-bold flex items-center gap-1 hover:bg-caplos-blue-100 transition border border-caplos-blue-200/60"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Hasil</span>
                    </Link>

                    {/* Delete Quiz */}
                    <button
                      onClick={() => handleDeleteQuiz(q.id, q.title)}
                      disabled={deletingId === q.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50 cursor-pointer"
                      title="Hapus Kuis"
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
