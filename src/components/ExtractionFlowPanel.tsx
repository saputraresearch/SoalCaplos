"use client";

import { CheckCircle2, XCircle, SkipForward, Loader2 } from "lucide-react";

export type ExtractionStep = {
  id: string;
  label: string;
  status: "success" | "failed" | "skipped";
  detail: string;
};

interface Props {
  steps: ExtractionStep[];
  isLoading?: boolean;
}

const statusIcon = (status: ExtractionStep["status"], isLastAndLoading: boolean) => {
  if (isLastAndLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
  }
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-400" />;
    case "skipped":
      return <SkipForward className="w-4 h-4 text-gray-400" />;
  }
};

const statusBadge = (status: ExtractionStep["status"]) => {
  switch (status) {
    case "success":
      return (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
          BERHASIL
        </span>
      );
    case "failed":
      return (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">
          GAGAL
        </span>
      );
    case "skipped":
      return (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          DILEWATI
        </span>
      );
  }
};

const STEP_ORDER = ["local_text", "ocr_space", "groq", "gemini_key1", "gemini_key2", "gemini", "groq_fallback"];

/** Placeholder steps shown while loading — animates in order */
const LOADING_PLACEHOLDERS = [
  { id: "local_text", label: "Ekstraksi Teks Lokal" },
  { id: "ocr_space", label: "OCR Space" },
  { id: "groq", label: "Groq AI" },
  { id: "gemini", label: "Gemini AI" },
];

export default function ExtractionFlowPanel({ steps, isLoading }: Props) {
  // Sort completed steps by pipeline order
  const sorted = [...steps].sort((a, b) => {
    const ai = STEP_ORDER.findIndex((s) => a.id.startsWith(s.replace("_key1", "").replace("_key2", "")));
    const bi = STEP_ORDER.findIndex((s) => b.id.startsWith(s.replace("_key1", "").replace("_key2", "")));
    return ai - bi;
  });

  // While loading with no steps yet, show placeholders
  if (isLoading && steps.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
        <p className="text-xs font-semibold text-blue-700 mb-2.5">🔍 Proses Ekstraksi Berlangsung...</p>
        <div className="space-y-2">
          {LOADING_PLACEHOLDERS.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              {i === 0 ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
              )}
              <span className="text-xs text-gray-500">{p.label}</span>
              {i === 0 && (
                <span className="text-[10px] text-blue-500 animate-pulse">memproses...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (steps.length === 0) return null;

  const hasFailure = steps.some((s) => s.status === "failed");
  const hasSuccess = steps.some((s) => s.status === "success");

  return (
    <div
      className={`mt-3 rounded-xl border p-3 ${
        hasSuccess
          ? "border-green-100 bg-green-50/60"
          : hasFailure
          ? "border-red-100 bg-red-50/50"
          : "border-gray-100 bg-gray-50"
      }`}
    >
      <p className="text-xs font-semibold text-gray-600 mb-2.5">
        {isLoading ? "🔍 Proses Ekstraksi Berlangsung..." : "📋 Riwayat Proses Ekstraksi"}
      </p>
      <div className="space-y-2">
        {sorted.map((step, i) => {
          const isLastAndLoading = isLoading && i === sorted.length - 1;
          return (
            <div key={step.id} className="flex items-start gap-2">
              {/* Connector line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="mt-0.5">{statusIcon(step.status, !!isLastAndLoading)}</div>
                {i < sorted.length - 1 && (
                  <div className="w-px h-4 bg-gray-200 mt-0.5" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-gray-700">{step.label}</span>
                  {!isLastAndLoading && statusBadge(step.status)}
                  {isLastAndLoading && (
                    <span className="text-[10px] text-blue-500 animate-pulse">memproses...</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{step.detail}</p>
              </div>
            </div>
          );
        })}
        {/* If loading and more steps may come */}
        {isLoading && (
          <div className="flex items-center gap-2 mt-1 opacity-40">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" />
            <span className="text-[11px] text-gray-400 italic">menunggu langkah berikutnya...</span>
          </div>
        )}
      </div>
    </div>
  );
}
