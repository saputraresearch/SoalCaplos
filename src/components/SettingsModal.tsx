"use client";

import { useState, useEffect } from "react";
import { Key, Save, Check, ExternalLink, X, ShieldCheck, Cpu } from "lucide-react";

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
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("quizcaplos_gemini_api_key") || "";
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
      setApiKey(storedKey);
      setModel(storedModel);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quizcaplos_gemini_api_key", apiKey.trim());
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
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-pop relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Gemini AI Settings</h3>
            <p className="text-xs text-slate-500">Configure your personal Vision OCR Key & Model</p>
          </div>
        </div>

        {/* API Key Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Your Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
          <p className="text-xs text-slate-500 flex items-center gap-1 pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Saved in your browser (localStorage).</span>
          </p>
        </div>

        {/* Model Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Model Selection</span>
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
            Automatically cascades to alternative models if the chosen model is unavailable.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
          <span className="font-semibold text-slate-800">Don&apos;t have a Gemini API Key?</span>
          <p>Get a free API key from Google AI Studio:</p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline pt-0.5"
          >
            <span>Get Free Gemini API Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md hover:bg-indigo-700 transition flex items-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
