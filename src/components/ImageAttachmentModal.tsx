"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Link as LinkIcon,
  Search,
  Sparkles,
  Check,
  Trash2,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Clipboard,
} from "lucide-react";
import { ImageSourceType } from "@/lib/types";

interface ImageAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageUrl?: string | null;
  initialSourceType?: ImageSourceType;
  initialAltText?: string | null;
  contextText?: string;
  title?: string;
  onApply: (imageData: {
    image_url: string;
    image_source_type: ImageSourceType;
    alt_text: string;
  }) => void;
}

// Curated educational image catalog for Google Search simulation
const SAMPLE_EDUCATIONAL_IMAGES = [
  {
    title: "Struktur Sel Tumbuhan & Dinding Sel",
    url: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800&auto=format&fit=crop&q=80",
    alt: "Diagram irisan sel tumbuhan dengan organel kloroplas dan vakuola",
    tags: ["sel", "tumbuhan", "biologi", "fotosintesis"],
  },
  {
    title: "Anatomi Organ Jantung Manusia",
    url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&auto=format&fit=crop&q=80",
    alt: "Ilustrasi anatomi jantung manusia menunjukkan serambi dan bilik",
    tags: ["jantung", "organ", "darah", "anatomi", "biologi"],
  },
  {
    title: "Tata Surya dan Orbit Planet",
    url: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=80",
    alt: "Diagram tata surya dengan planet-planet yang mengitari matahari",
    tags: ["tata surya", "planet", "astronomi", "bumi", "matahari", "fisika"],
  },
  {
    title: "Peta Geografis Kepulauan Indonesia",
    url: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format&fit=crop&q=80",
    alt: "Peta topografi wilayah kepulauan Indonesia",
    tags: ["peta", "indonesia", "geografi", "pulau", "ips"],
  },
  {
    title: "Struktur Segitiga & Teorema Pythagoras",
    url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80",
    alt: "Diagram geometris segitiga siku-siku dengan rumus Pythagoras",
    tags: ["matematika", "segitiga", "geometri", "rumus", "stem"],
  },
  {
    title: "Siklus Hidrologi / Daur Air Alami",
    url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80",
    alt: "Skema siklus air alami dari penguapan evaporasi hingga presipitasi hujan",
    tags: ["air", "siklus", "hujan", "alam", "ipa", "lingkungan"],
  },
];

export default function ImageAttachmentModal({
  isOpen,
  onClose,
  initialImageUrl = "",
  initialSourceType = "NONE",
  initialAltText = "",
  contextText = "",
  title = "Kelola Aset Gambar Soal",
  onApply,
}: ImageAttachmentModalProps) {
  const [activeTab, setActiveTab] = useState<"PASTE_UPLOAD" | "DIRECT_LINK" | "GOOGLE_IMAGE_SEARCH">("PASTE_UPLOAD");
  const [imageUrl, setImageUrl] = useState(initialImageUrl || "");
  const [sourceType, setSourceType] = useState<ImageSourceType>(initialSourceType || "NONE");
  const [altText, setAltText] = useState(initialAltText || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeneratingAlt, setIsGeneratingAlt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setImageUrl(initialImageUrl || "");
      setSourceType(initialSourceType || (initialImageUrl ? "DIRECT_LINK" : "NONE"));
      setAltText(initialAltText || "");
      setErrorMsg(null);
      if (initialSourceType === "GOOGLE_IMAGE_SEARCH") {
        setActiveTab("GOOGLE_IMAGE_SEARCH");
      } else if (initialSourceType === "DIRECT_LINK") {
        setActiveTab("DIRECT_LINK");
      } else {
        setActiveTab("PASTE_UPLOAD");
      }
      if (contextText) {
        setSearchQuery(contextText.slice(0, 30));
      }
    }
  }, [isOpen, initialImageUrl, initialSourceType, initialAltText, contextText]);

  // Global clipboard paste listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              setImageUrl(base64);
              setSourceType("PASTE_UPLOAD");
              setActiveTab("PASTE_UPLOAD");
              setErrorMsg(null);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Harap pilih berkas gambar yang valid (PNG, JPG, WebP, SVG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImageUrl(base64);
      setSourceType("PASTE_UPLOAD");
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Auto Generate Alt Text with AI
  const handleAutoGenerateAlt = async () => {
    if (!imageUrl) {
      setErrorMsg("Lampirkan gambar terlebih dahulu sebelum membuat Alt Text otomatis.");
      return;
    }

    setIsGeneratingAlt(true);
    setErrorMsg(null);

    try {
      const apiKey = typeof window !== "undefined" ? localStorage.getItem("quizcaplos_gemini_api_key") : null;
      const model = typeof window !== "undefined" ? localStorage.getItem("quizcaplos_gemini_model") : null;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["x-gemini-api-key"] = apiKey;
      if (model) headers["x-gemini-model"] = model;

      const res = await fetch("/api/process-question-image", {
        method: "POST",
        headers,
        body: JSON.stringify({
          tipe_soal: "MULTIPLE_CHOICE",
          question: {
            text: contextText || "Pertanyaan Kuis",
            image_source_type: sourceType,
            image_url: imageUrl,
            alt_text: "",
          },
        }),
      });

      if (!res.ok) throw new Error("Gagal membuat Alt Text otomatis.");
      const data = await res.json();
      if (data.question?.alt_text) {
        setAltText(data.question.alt_text);
      }
    } catch (err) {
      console.warn("Auto Alt Text fallback:", err);
      // Fallback
      setAltText(`Ilustrasi diagram visual untuk materi: ${contextText.slice(0, 60)}`);
    } finally {
      setIsGeneratingAlt(false);
    }
  };

  const handleApply = () => {
    onApply({
      image_url: imageUrl.trim(),
      image_source_type: imageUrl.trim() ? sourceType : "NONE",
      alt_text: altText.trim(),
    });
    onClose();
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setSourceType("NONE");
    setAltText("");
  };

  // Filter educational images based on search query
  const filteredSearchImages = SAMPLE_EDUCATIONAL_IMAGES.filter((img) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      img.title.toLowerCase().includes(q) ||
      img.alt.toLowerCase().includes(q) ||
      img.tags.some((t) => t.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-pop border border-slate-100 my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">
                Pilih salah satu dari 3 metode input gambar resmi di bawah ini.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("PASTE_UPLOAD")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
              activeTab === "PASTE_UPLOAD"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Paste / Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DIRECT_LINK")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
              activeTab === "DIRECT_LINK"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>2. Direct Link URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("GOOGLE_IMAGE_SEARCH")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
              activeTab === "GOOGLE_IMAGE_SEARCH"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>3. Google Image Search</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PASTE / UPLOAD */}
          {activeTab === "PASTE_UPLOAD" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2.5"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Klik untuk pilih berkas gambar atau drag &amp; drop di sini
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Atau tekan <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Cmd+V</kbd> langsung untuk paste gambar dari clipboard
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT LINK */}
          {activeTab === "DIRECT_LINK" && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Tempelkan Direct Link Gambar (URL):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setSourceType("DIRECT_LINK");
                  }}
                  placeholder="https://example.com/diagram-sel.png"
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Pastikan link gambar langsung berakhiran format .png, .jpg, .svg, atau URL gambar publik.
              </p>
            </div>
          )}

          {/* TAB 3: GOOGLE IMAGE SEARCH WIDGET */}
          {activeTab === "GOOGLE_IMAGE_SEARCH" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cari Gambar Edukasi Google:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari gambar materi..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Grid of Results */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-1">
                {filteredSearchImages.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setImageUrl(item.url);
                      setSourceType("GOOGLE_IMAGE_SEARCH");
                      setAltText(item.alt);
                    }}
                    className={`rounded-xl border p-1.5 cursor-pointer transition hover:border-indigo-500 hover:shadow-md ${
                      imageUrl === item.url
                        ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-400"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <p className="text-[11px] font-bold text-slate-800 mt-1 truncate">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PREVIEW OF ATTACHED IMAGE & SOURCE BADGE */}
          {imageUrl && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Pratinjau Aset Gambar:</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Sumber: {sourceType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Gambar</span>
                </button>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={altText || "Pratinjau gambar kuis"}
                  className="max-h-48 object-contain rounded-lg"
                  onError={() => setErrorMsg("Gagal memuat pratinjau gambar. Pastikan URL atau berkas valid.")}
                />
              </div>

              {/* ALT TEXT INPUT (Rule 3: Accessibility Alt Text) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Alt Text (Teks Aksesibilitas Siswa):
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateAlt}
                    disabled={isGeneratingAlt}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition disabled:opacity-50"
                  >
                    {isGeneratingAlt ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Buat Alt Text Otomatis (AI)</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Deskripsi singkat gambar untuk screen reader siswa..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 bg-white"
                />
                <p className="text-[10px] text-slate-500">
                  Teks ini otomatis dibacakan oleh pembaca layar atau tampil jika koneksi siswa lambat.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 transition"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Aset Gambar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
