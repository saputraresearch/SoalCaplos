"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Quiz, Submission } from "@/lib/types";
import StudentAnswerModal from "@/components/StudentAnswerModal";
import {
  Download,
  Users,
  Award,
  Percent,
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  Eye,
  Trash2,
} from "lucide-react";

export default function QuizResultsPage() {
  const params = useParams();
  const quizId = params?.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!quizId) return;
      try {
        setLoading(true);

        const [quizRes, subsRes] = await Promise.all([
          fetch("/api/quizzes"),
          fetch(`/api/submit-quiz?quiz_id=${quizId}`),
        ]);

        const quizData = await quizRes.json();
        const subsData = await subsRes.json();

        if (quizData?.quizzes) {
          const matched = quizData.quizzes.find((q: Quiz) => q.id === quizId);
          if (matched) setQuiz(matched);
        }

        if (subsData?.submissions) {
          setSubmissions(subsData.submissions);
        }
      } catch (err) {
        console.error("Error loading results:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [quizId]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!quiz || submissions.length === 0) return;

    const headers = ["Student Name", "Score", "Total Questions", "Accuracy (%)", "Completed At"];
    const rows = submissions.map((s) => {
      const accuracy = s.total_questions > 0 ? Math.round((s.score / s.total_questions) * 100) : 0;
      const dateStr = new Date(s.completed_at).toLocaleString();
      return `"${s.student_name.replace(/"/g, '""')}",${s.score},${s.total_questions},${accuracy}%,${dateStr}`;
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    const sanitizedTitle = quiz.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.setAttribute("download", `${sanitizedTitle}_Grades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete single submission
  const handleDeleteSubmission = async (subId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete submission for "${studentName}"?`)) return;

    try {
      const res = await fetch(`/api/submit-quiz?id=${subId}`, { method: "DELETE" });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      } else {
        alert("Failed to delete submission.");
      }
    } catch {
      alert("Error deleting submission.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const totalSubmissions = submissions.length;
  const avgScore =
    totalSubmissions > 0
      ? (submissions.reduce((acc, curr) => acc + curr.score, 0) / totalSubmissions).toFixed(1)
      : "0";
  const avgAccuracy =
    totalSubmissions > 0
      ? Math.round(
          submissions.reduce(
            (acc, curr) => acc + (curr.total_questions > 0 ? (curr.score / curr.total_questions) * 100 : 0),
            0
          ) / totalSubmissions
        )
      : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      <div className="space-y-2">
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quizzes List</span>
        </Link>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Results: {quiz?.title || "Quiz Submissions"}
          </h1>

          <button
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Grades to CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Total Submissions
            </span>
            <span className="text-2xl font-bold text-slate-900">{totalSubmissions}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Average Score
            </span>
            <span className="text-2xl font-bold text-slate-900">{avgScore}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500">
              Class Accuracy
            </span>
            <span className="text-2xl font-bold text-slate-900">{avgAccuracy}%</span>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Student Submission Tracker</h3>
            <p className="text-xs text-slate-500">Click any student row to inspect their full answer breakdown.</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{totalSubmissions} records</span>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No student submissions recorded yet.</p>
            <p className="text-xs">Share the quiz link with your students to start receiving results.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="p-4 pl-6">Student Name</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Accuracy</th>
                  <th className="p-4">Completed At</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {submissions.map((sub) => {
                  const acc =
                    sub.total_questions > 0
                      ? Math.round((sub.score / sub.total_questions) * 100)
                      : 0;

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition"
                      title="Click to view answers"
                    >
                      <td className="p-4 pl-6 font-bold text-slate-900 flex items-center gap-2">
                        <span>{sub.student_name}</span>
                        <Eye className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100" />
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-indigo-600">
                          {sub.score} / {sub.total_questions}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            acc >= 75
                              ? "bg-emerald-100 text-emerald-800"
                              : acc >= 50
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {acc}%
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(sub.completed_at).toLocaleString()}
                      </td>
                      <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Inspect Student Answers"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(sub.id, sub.student_name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete Submission"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentAnswerModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
}
