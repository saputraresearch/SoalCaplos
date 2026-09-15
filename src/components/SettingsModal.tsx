"use client";

import { useState, useEffect } from "react";
import { Key, Save, Check, ExternalLink, X, ShieldCheck, Cpu, Eye, EyeOff, Info } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Direkomendasikan - Sangat Cepat & Cerdas)" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Standar Stabil & Efisien)" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Akurasi Tinggi - Penalaran Mendalam)" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite (Super Ringan)" },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [primaryKey, setPrimaryKey] = useState("");
  const [backupKey, setBackupKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);
  const [model, setModel] = useState("gemini-2.0-flash");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("quizcaplos_gemini_api_key") || "";
      const [k1, ...rest] = storedKey.split(/[\s,\n;]+/).filter(Boolean);
      setPrimaryKey(k1 || "");
      setBackupKey(rest.join(",") || "");

      let storedModel = localStorage.getItem("quizcaplos_gemini_model") || "gemini-2.0-flash";
      if (
        storedModel.includes("3.6") ||
        storedModel.includes("2.5") ||
        storedModel.includes("exp") ||
        storedModel === "gemini-3.6-flash" ||
        storedModel === "gemini-2.5-flash" ||
        storedModel === "gemini-2.5-pro" ||
        storedModel === "gemini-2.0-flash-exp" ||
        storedModel === "gemini-1.5-flash-latest" ||
        storedModel === "gemini-1.5-pro-latest"
      ) {
        storedModel = "gemini-2.0-flash";
        localStorage.setItem("quizcaplos_gemini_model", "gemini-2.0-flash");
      }
      setModel(storedModel);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      const combined = [primaryKey.trim(), backupKey.trim()].filter(Boolean).join(",");
      localStorage.setItem("quizcaplos_gemini_api_key", combined);
      localStorage.setItem("quizcaplos_gemini_model", model);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-pop relative border border-slate-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Pengaturan Gemini AI</h3>
            <p className="text-xs text-slate-500">Kelola API Key & Model AI untuk ekstraksi PDF otomatis</p>
          </div>
        </div>

        {/* API Key 1 (Utama) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              API Key Utama (Wajib)
            </label>
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showKeys ? "Sembunyikan" : "Tampilkan"}</span>
            </button>
          </div>
          <input
            type={showKeys ? "text" : "password"}
            value={primaryKey}
            onChange={(e) => setPrimaryKey(e.target.value)}
            placeholder="AIzaSy... (API Key pertama)"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* API Key 2 (Cadangan Otomatis) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              API Key Cadangan (Opsional)
            </label>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
              Auto-Failover Kuota
            </span>
          </div>
          <input
            type={showKeys ? "text" : "password"}
            value={backupKey}
            onChange={(e) => setBackupKey(e.target.value)}
            placeholder="AIzaSy... (Otomatis dipakai jika Key Utama kena limit)"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
          <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
            <div className="flex items-start gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>Tips Kuota Mandiri:</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Di Google AI Studio, kuota gratis dihitung <strong>per Project</strong>. Agar kuota cadangan benar-benar terpisah, buat Key Cadangan di <strong>Project Baru</strong> (bukan project yang sama) atau dari akun Google lain.
            </p>
          </div>
        </div>

        {/* Model Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pilihan Model Gemini</span>
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Sistem otomatis menggunakan mode Hybrid Text untuk menghemat kuota hingga 90%.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
          <span className="font-semibold text-slate-800">Dapatkan API Key Gratis Google:</span>
          <p>Buka Google AI Studio untuk membuat API Key gratis tanpa kartu kredit:</p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline pt-0.5"
          >
            <span>Buka Google AI Studio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md hover:bg-indigo-700 transition flex items-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
