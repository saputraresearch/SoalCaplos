"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Quiz, Question, StudentAnswer, QuestionType } from "@/lib/types";
import { playSound } from "@/lib/sound";
import {
  Trophy,
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  HelpCircle,
  User,
  Loader2,
  Check,
  X,
  Award,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  Send,
  BookOpen,
  MapPin,
  Target,
  Layers,
  Tag,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";
import KidFriendlyQuestionText from "@/components/KidFriendlyQuestionText";

interface BlankPart {
  type: "text" | "blank";
  content: string;
  blankIndex?: number;
}

function parseBlanksFromText(text: string): { blankCount: number; parts: BlankPart[] } {
  if (!text) {
    return { blankCount: 1, parts: [{ type: "blank", content: "[___]", blankIndex: 0 }] };
  }
  const regex = /\[(?:_{2,}|\.{2,}|\s*_{2,}\s*|\s*\.{2,}\s*)\]|_{3,}/g;
  const parts: BlankPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blankCount = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: "blank", content: match[0], blankIndex: blankCount });
    blankCount++;
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.substring(lastIndex) });
  }

  if (blankCount === 0) {
    return {
      blankCount: 1,
      parts: [
        { type: "text", content: text },
        { type: "blank", content: " [___]", blankIndex: 0 },
      ],
    };
  }

  return { blankCount, parts };
}

function getExpectedKeywordsForBlank(q: Question, blankIndex: number, totalBlanks: number): string[] {
  const rawKeywords = q.blanks_keywords || [];

  // Case 1: Pipe delimiter e.g. ["karbondioksida, co2 | oksigen, o2"]
  if (rawKeywords.length === 1 && rawKeywords[0].includes("|")) {
    const segments = rawKeywords[0].split("|").map((s) => s.trim());
    if (segments[blankIndex]) {
      return segments[blankIndex]
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    }
  }

  // Case 2: Array has at least totalBlanks entries e.g. ["karbondioksida, co2", "oksigen, o2"]
  if (rawKeywords.length >= totalBlanks && totalBlanks > 1) {
    const entry = rawKeywords[blankIndex] || "";
    return entry
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  // Case 3: Single comma-separated string with totalBlanks > 1 e.g. ["karbondioksida, oksigen"]
  if (rawKeywords.length === 1 && rawKeywords[0].includes(",") && totalBlanks > 1) {
    const parts = rawKeywords[0].split(",").map((k) => k.trim()).filter(Boolean);
    if (parts[blankIndex]) {
      return [parts[blankIndex]];
    }
  }

  // Case 4: q.options has items matching blanks count
  if (q.options && q.options.length >= totalBlanks && totalBlanks > 1) {
    const opt = q.options[blankIndex];
    if (opt) return [opt.trim()];
  }

  // Case 5: Single blank
  if (totalBlanks <= 1) {
    const list: string[] = [];
    rawKeywords.forEach((k) => {
      k.split(",").forEach((sub) => {
        const t = sub.trim();
        if (t) list.push(t);
      });
    });
    if (
      q.options &&
      typeof q.correct_answer_index === "number" &&
      q.options[q.correct_answer_index]
    ) {
      list.push(q.options[q.correct_answer_index].trim());
    }
    return list.length > 0 ? list : [];
  }

  return rawKeywords[blankIndex] ? [rawKeywords[blankIndex].trim()] : [];
}

const STEP_COLORS = [
  { bg: "bg-sky-500", text: "text-white", border: "border-sky-300", light: "bg-sky-50", badge: "bg-sky-100 text-sky-800" },
  { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-300", light: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-800" },
  { bg: "bg-amber-500", text: "text-white", border: "border-amber-300", light: "bg-amber-50", badge: "bg-amber-100 text-amber-800" },
  { bg: "bg-purple-500", text: "text-white", border: "border-purple-300", light: "bg-purple-50", badge: "bg-purple-100 text-purple-800" },
  { bg: "bg-rose-500", text: "text-white", border: "border-rose-300", light: "bg-rose-50", badge: "bg-rose-100 text-rose-800" },
  { bg: "bg-indigo-500", text: "text-white", border: "border-indigo-300", light: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-800" },
  { bg: "bg-teal-500", text: "text-white", border: "border-teal-300", light: "bg-teal-50", badge: "bg-teal-100 text-teal-800" },
];

const QUESTION_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  MULTIPLE_CHOICE: { label: "Pilihan Ganda", icon: "🔘", color: "bg-blue-50 text-blue-700 border-blue-200" },
  REORDER: { label: "Urutan Langkah (Tap/Drag)", icon: "🔄", color: "bg-amber-50 text-amber-700 border-amber-200" },
  MATCHING: { label: "Menjodohkan 1-ke-1", icon: "🧩", color: "bg-purple-50 text-purple-700 border-purple-200" },
  MULTIPLE_SELECT: { label: "Pilihan Ganda Kompleks", icon: "☑️", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  FILL_IN_THE_BLANKS: { label: "Isian Rumpang", icon: "✏️", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CATEGORIZE_ITEMS: { label: "Pengelompokan Kategori", icon: "📦", color: "bg-teal-50 text-teal-700 border-teal-200" },
  TRUE_OR_FALSE: { label: "Benar atau Salah", icon: "⚖️", color: "bg-rose-50 text-rose-700 border-rose-200" },
  MATH_RESPONSE: { label: "Matematika & Angka", icon: "🔢", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  IMAGE_LABELING: { label: "Labeling Gambar", icon: "📍", color: "bg-sky-50 text-sky-700 border-sky-200" },
  IMAGE_HOTSPOT: { label: "Hotspot Titik", icon: "🎯", color: "bg-orange-50 text-orange-700 border-orange-200" },
  OPEN_ENDED: { label: "Uraian / Esai", icon: "📝", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const DEMO_QUIZ: Quiz = {
  id: "demo-quiz-id",
  title: "Demo Showroom: Eksplorasi 8 Tipe Soal Interaktif Caplos",
  slug: "demo",
  created_at: new Date().toISOString(),
  status: "published",
};

const DEMO_QUESTIONS: Question[] = [
  {
    id: "demo-q1",
    quiz_id: "demo-quiz-id",
    question_text: "Planet manakah dalam tata surya kita yang memiliki julukan terkenal sebagai 'Planet Merah'?",
    question_type: "MULTIPLE_CHOICE",
    image_url: null,
    options: ["Merkurius", "Mars", "Jupiter", "Venus"],
    correct_answer_index: 1,
    explanation: "Mars tampak kemerahan di langit malam karena permukaannya kaya akan kandungan senyawa besi oksida (karat).",
    order_index: 0,
  },
  {
    id: "demo-q2",
    quiz_id: "demo-quiz-id",
    question_text: "Susunlah tahapan metamorfosis sempurna pada kupu-kupu dari fase paling awal hingga menjadi kupu-kupu dewasa!",
    question_type: "REORDER",
    image_url: null,
    options: ["Telur", "Ulat (Larva)", "Kepompong (Pupa)", "Kupu-kupu Dewasa"],
    correct_answer_index: 0,
    reorder_items: ["Telur", "Ulat (Larva)", "Kepompong (Pupa)", "Kupu-kupu Dewasa"],
    correct_order: [0, 1, 2, 3],
    explanation: "Daur hidup kupu-kupu dimulai dari Telur yang menetas menjadi Ulat (larva), kemudian beristirahat dalam Kepompong (pupa), dan akhirnya keluar sebagai Kupu-kupu Dewasa.",
    order_index: 1,
  },
  {
    id: "demo-q3",
    quiz_id: "demo-quiz-id",
    question_text: "Pasangkan setiap organ tubuh manusia berikut dengan fungsi utamanya yang paling tepat!",
    question_type: "MATCHING",
    image_url: null,
    options: [],
    correct_answer_index: 0,
    matching_pairs: [
      { left: "Jantung", right: "Memompa darah ke seluruh tubuh" },
      { left: "Paru-paru", right: "Pertukaran oksigen dan karbon dioksida" },
      { left: "Lambung", right: "Mencerna makanan secara kimiawi & mekanik" },
      { left: "Otak", right: "Pusat pengendali seluruh aktivitas tubuh" },
    ],
    explanation: "Setiap organ memiliki peran vital: Jantung memompa darah, Paru-paru untuk pernapasan, Lambung mencerna makanan, dan Otak mengendalikan koordinasi tubuh.",
    order_index: 2,
  },
  {
    id: "demo-q4",
    quiz_id: "demo-quiz-id",
    question_text: "Pilihlah SEMUA hewan di bawah ini yang tergolong sebagai pemakan tumbuhan (Herbivora)! (Bisa memilih lebih dari satu jawaban)",
    question_type: "MULTIPLE_SELECT",
    image_url: null,
    options: ["Kelinci", "Harimau", "Sapi", "Singa", "Gajah"],
    correct_answer_index: 0,
    correct_answers: [0, 2, 4],
    explanation: "Kelinci, Sapi, dan Gajah adalah hewan herbivora karena makanan utamanya adalah rumput, daun, atau buah-buahan. Harimau dan Singa adalah karnivora pemakan daging.",
    order_index: 3,
  },
  {
    id: "demo-q5",
    quiz_id: "demo-quiz-id",
    question_text: "Tumbuhan hijau memasak makanannya sendiri melalui proses [___] dengan bantuan sinar matahari dan melepaskan gas [___] yang kita hirup sehari-hari.",
    question_type: "FILL_IN_THE_BLANKS",
    image_url: null,
    options: [],
    correct_answer_index: 0,
    blanks_keywords: ["fotosintesis", "oksigen, o2"],
    explanation: "Melalui proses fotosintesis, klorofil pada daun menyerap cahaya matahari untuk mengubah air dan karbon dioksida menjadi energi serta gas oksigen.",
    order_index: 4,
  },
  {
    id: "demo-q6",
    quiz_id: "demo-quiz-id",
    question_text: "Kelompokkan benda-benda berikut ke dalam wujud zat yang sesuai (Padat, Cair, atau Gas)!",
    question_type: "CATEGORIZE_ITEMS",
    image_url: null,
    options: [],
    correct_answer_index: 0,
    categories: ["Benda Padat", "Benda Cair", "Benda Gas"],
    categorize_items: [
      { text: "Batu Kerikil", category: "Benda Padat" },
      { text: "Meja Kayu", category: "Benda Padat" },
      { text: "Minyak Goreng", category: "Benda Cair" },
      { text: "Susu Segar", category: "Benda Cair" },
      { text: "Udara di Balon", category: "Benda Gas" },
      { text: "Uap Air Panas", category: "Benda Gas" },
    ],
    explanation: "Benda padat memiliki bentuk dan volume tetap. Benda cair bentuknya mengikuti wadah. Benda gas mengisi seluruh ruangan yang ditempatinya.",
    order_index: 5,
  },
  {
    id: "demo-q7",
    quiz_id: "demo-quiz-id",
    question_text: "Bulan memancarkan cahayanya sendiri pada malam hari sama seperti matahari.",
    question_type: "TRUE_OR_FALSE",
    image_url: null,
    options: ["Benar", "Salah"],
    correct_answer_index: 1,
    explanation: "Salah! Bulan tidak menghasilkan cahaya sendiri. Cahaya bulan yang kita lihat di malam hari adalah pantulan sinar matahari pada permukaan bulan.",
    order_index: 6,
  },
  {
    id: "demo-q8",
    quiz_id: "demo-quiz-id",
    question_text: "Ibu membeli 4 kotak donat untuk acara keluarga. Jika setiap kotak berisi 6 buah donat lezat, berapakah jumlah seluruh donat yang dibeli Ibu?",
    question_type: "MATH_RESPONSE",
    image_url: null,
    options: ["24"],
    correct_answer_index: 0,
    math_solution: "4 kotak × 6 donat = 24 donat",
    explanation: "Untuk mencari jumlah total donat: 4 kotak × 6 donat per kotak = 24 donat.",
    order_index: 7,
  },
];

export default function StudentQuizPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const isDemo = slug === "demo";

  const [loading, setLoading] = useState(!isDemo);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(isDemo ? DEMO_QUIZ : null);
  const [questions, setQuestions] = useState<Question[]>(isDemo ? DEMO_QUESTIONS : []);

  // Quiz state
  const [studentName, setStudentName] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answering states for all 11 types
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedMultiIndices, setSelectedMultiIndices] = useState<number[]>([]);
  const [userMatches, setUserMatches] = useState<Record<string, string>>({});
  const [shuffledMatchingOptions, setShuffledMatchingOptions] = useState<string[]>([]);
  const [selectedMatchingChip, setSelectedMatchingChip] = useState<string | null>(null);
  const [draggedMatchingChip, setDraggedMatchingChip] = useState<string | null>(null);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [selectedReorderIndex, setSelectedReorderIndex] = useState<number | null>(null);
  const [draggedReorderIndex, setDraggedReorderIndex] = useState<number | null>(null);
  const [userText, setUserText] = useState<string>("");
  const [userMultiBlanks, setUserMultiBlanks] = useState<Record<number, string>>({});
  const [multiBlankResults, setMultiBlankResults] = useState<{ isCorrect: boolean; key: string }[]>([]);
  const [userLabelMatches, setUserLabelMatches] = useState<Record<string, string>>({});
  const [shuffledLabelChips, setShuffledLabelChips] = useState<string[]>([]);
  const [selectedLabelChip, setSelectedLabelChip] = useState<string | null>(null);
  const [userHotspotCoords, setUserHotspotCoords] = useState<{ x: number; y: number } | null>(null);
  const [userCategorization, setUserCategorization] = useState<Record<string, string[]>>({});
  const [shuffledCategorizeItems, setShuffledCategorizeItems] = useState<{ text: string; category: string }[]>([]);
  const [selectedCategoryItem, setSelectedCategoryItem] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastIsCorrect, setLastIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answersList, setAnswersList] = useState<StudentAnswer[]>([]);

  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishingFromRunner, setIsPublishingFromRunner] = useState(false);

  const handlePublishNow = async () => {
    if (!quiz?.id || isDemo) return;
    setIsPublishingFromRunner(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (res.ok) {
        setQuiz((prev) => (prev ? { ...prev, status: "published" } : null));
      }
    } catch (err) {
      console.error("Error publishing quiz:", err);
    } finally {
      setIsPublishingFromRunner(false);
    }
  };

  // Helper to accurately identify question type
  const getQuestionType = (q: Question): QuestionType => {
    if (!q) return "MULTIPLE_CHOICE";

    // 1. If question has multiple correct answers, it is ALWAYS MULTIPLE_SELECT
    if (Array.isArray(q.correct_answers) && q.correct_answers.length > 1) {
      return "MULTIPLE_SELECT";
    }

    // 2. High-priority structural data checks (if question has specialized data fields, respect them)
    if (Array.isArray(q.reorder_items) && q.reorder_items.length > 0) {
      return "REORDER";
    }
    if (Array.isArray(q.matching_pairs) && q.matching_pairs.length > 0) {
      return "MATCHING";
    }
    if (Array.isArray(q.label_targets) && q.label_targets.length > 0) {
      return "IMAGE_LABELING";
    }
    if (q.hotspot_zone && typeof q.hotspot_zone.x === "number") {
      return "IMAGE_HOTSPOT";
    }
    if (Array.isArray(q.categorize_items) && q.categorize_items.length > 0) {
      return "CATEGORIZE_ITEMS";
    }

    // 3. Normalized check for question_type string
    const rawType = q.question_type
      ? String(q.question_type).trim().toUpperCase().replace(/[-\s]/g, "_")
      : "";

    if (
      rawType === "MULTIPLE_SELECT" ||
      rawType === "MULTIPLESELECT" ||
      rawType === "MULTI_SELECT" ||
      rawType === "PILIHAN_GANDA_KOMPLEKS" ||
      rawType === "CHECKBOX"
    ) {
      return "MULTIPLE_SELECT";
    }

    if (rawType === "TRUE_OR_FALSE" || rawType === "BENAR_SALAH" || rawType === "BOOLEAN") {
      return "TRUE_OR_FALSE";
    }
    if (rawType === "MATCHING" || rawType === "MENJODOHKAN") {
      return "MATCHING";
    }
    if (rawType === "REORDER" || rawType === "URUTAN") {
      return "REORDER";
    }
    if (rawType === "FILL_IN_THE_BLANKS" || rawType === "ISIAN_SINGKAT" || rawType === "ISIAN_RUMPANG") {
      return "FILL_IN_THE_BLANKS";
    }
    if (rawType === "OPEN_ENDED" || rawType === "ESAI" || rawType === "URAIAN") {
      return "OPEN_ENDED";
    }
    if (rawType === "MATH_RESPONSE" || rawType === "MATEMATIKA" || rawType === "STEM") {
      return "MATH_RESPONSE";
    }
    if (rawType === "IMAGE_LABELING") {
      return "IMAGE_LABELING";
    }
    if (rawType === "IMAGE_HOTSPOT") {
      return "IMAGE_HOTSPOT";
    }
    if (rawType === "CATEGORIZE_ITEMS" || rawType === "PENGELOMPOKAN") {
      return "CATEGORIZE_ITEMS";
    }

    // 4. Question text heuristics (e.g. prompt keywords)
    if (
      q.question_text &&
      /^(urutkan|susunlah|urutan\s+tahapan|urutan\s+langkah|tahapan\s+berikut)/i.test(q.question_text.trim())
    ) {
      return "REORDER";
    }

    if (
      q.question_text &&
      /\[___\]/.test(q.question_text) &&
      (!q.options || q.options.length <= 1)
    ) {
      return "FILL_IN_THE_BLANKS";
    }

    if (
      q.question_text &&
      /(pilih\s+(semua|2|3|4|dua|tiga|empat)|pilihan\s+ganda\s+kompleks|lebih\s+dari\s+satu\s+jawaban)/i.test(q.question_text) &&
      (q.options && q.options.length >= 3)
    ) {
      return "MULTIPLE_SELECT";
    }

    if (q.options?.length === 2 && (q.options[0] === "Benar" || q.options[0] === "True")) {
      return "TRUE_OR_FALSE";
    }

    return "MULTIPLE_CHOICE";
  };

  // Fetch Quiz & Questions on mount
  useEffect(() => {
    async function fetchQuizData() {
      if (!slug) return;
      try {
        setLoading(true);

        if (slug === "demo") {
          setQuiz(DEMO_QUIZ);
          setQuestions(DEMO_QUESTIONS);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/quizzes/${slug}`);
        const data = await res.json();

        if (!res.ok || data.error || !data.quiz) {
          setErrorMsg(data.error || "Quiz not found or link has expired.");
          setLoading(false);
          return;
        }

        setQuiz(data.quiz);
        setQuestions(data.questions || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }

    fetchQuizData();
  }, [slug]);

  // Reset answer states and initialize randomized presentation when question changes
  useEffect(() => {
    setSelectedIndex(null);
    setSelectedMultiIndices([]);
    setUserMatches({});
    setSelectedMatchingChip(null);
    setDraggedMatchingChip(null);
    setUserText("");
    setUserLabelMatches({});
    setSelectedLabelChip(null);
    setUserHotspotCoords(null);
    setSelectedCategoryItem(null);
    setSelectedReorderIndex(null);
    setDraggedReorderIndex(null);
    setUserMultiBlanks({});
    setMultiBlankResults([]);
    setIsAnswered(false);
    setLastIsCorrect(false);

    const q = questions[currentIndex];
    if (q) {
      const qType = getQuestionType(q);

      // 1. REORDER: Scramble items so student must actively sort them
      if (qType === "REORDER" && q.reorder_items && q.reorder_items.length > 0) {
        const originalItems = [...q.reorder_items];
        const correctOrder = q.correct_order || [];

        let expectedItems = [...originalItems];
        if (correctOrder.length === originalItems.length && originalItems.length > 0) {
          expectedItems = [...originalItems]
            .map((item, i) => ({ item, order: correctOrder[i] || i + 1 }))
            .sort((a, b) => a.order - b.order)
            .map((x) => x.item);
        }

        // Fisher-Yates Shuffle
        const shuffled = [...originalItems];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Guarantee that if length > 1, the initial state is NOT the already solved state
        if (shuffled.length > 1 && shuffled.every((val, i) => val === expectedItems[i])) {
          [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
        }

        setUserOrder(shuffled);
      } else {
        setUserOrder([]);
      }

      // 2. MATCHING: Scramble right-hand options so choices are not displayed in parallel solved order
      if (qType === "MATCHING" && q.matching_pairs && q.matching_pairs.length > 0) {
        const rightOpts = q.matching_pairs.map((p) => p.right);
        const shuffled = [...rightOpts];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        // If identical to original and length > 1, swap first two
        if (shuffled.length > 1 && shuffled.every((val, i) => val === rightOpts[i])) {
          [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
        }
        setShuffledMatchingOptions(shuffled);
      } else {
        setShuffledMatchingOptions([]);
      }

      // 3. IMAGE_LABELING: Scramble label chips pool
      if (qType === "IMAGE_LABELING" && q.label_targets && q.label_targets.length > 0) {
        const labels = q.label_targets.map((t) => t.label);
        const shuffled = [...labels];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setShuffledLabelChips(shuffled);
      } else {
        setShuffledLabelChips([]);
      }

      // 4. CATEGORIZE_ITEMS: Initialize category buckets and scramble unassigned item pool
      if (qType === "CATEGORIZE_ITEMS") {
        if (q.categories) {
          const initCats: Record<string, string[]> = {};
          q.categories.forEach((c) => {
            initCats[c] = [];
          });
          setUserCategorization(initCats);
        }
        if (q.categorize_items && q.categorize_items.length > 0) {
          const items = [...q.categorize_items];
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
          }
          setShuffledCategorizeItems(items);
        } else {
          setShuffledCategorizeItems([]);
        }
      }
    }
  }, [currentIndex, questions]);

  const currentQ = questions[currentIndex];
  const currentType = currentQ ? getQuestionType(currentQ) : "MULTIPLE_CHOICE";

  // 1. Single Option Select (MULTIPLE_CHOICE)
  const handleSelectOption = (oIndex: number) => {
    if (isAnswered) return;

    // Critical Safeguard: If this question is MULTIPLE_SELECT or has multiple answers, route to toggleMultiSelect
    if (
      currentType === "MULTIPLE_SELECT" ||
      (Array.isArray(currentQ.correct_answers) && currentQ.correct_answers.length > 1)
    ) {
      toggleMultiSelect(oIndex);
      return;
    }

    const isCorrect = oIndex === currentQ.correct_answer_index;
    setSelectedIndex(oIndex);
    setIsAnswered(true);
    setLastIsCorrect(isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: currentType,
        selected_index: oIndex,
        correct_index: currentQ.correct_answer_index,
        is_correct: isCorrect,
      },
    ]);
  };

  // 2. True / False Select
  const handleSelectTrueFalse = (oIndex: number) => {
    if (isAnswered) return;

    let expectedIdx = currentQ.correct_answer_index ?? 0;
    if (currentQ.options && currentQ.options.length === 2) {
      const optText = currentQ.options[expectedIdx]?.toLowerCase() || "";
      if (optText.includes("salah") || optText.includes("false")) {
        expectedIdx = 1;
      } else if (optText.includes("benar") || optText.includes("true")) {
        expectedIdx = 0;
      }
    }

    const isCorrect = oIndex === expectedIdx;
    setSelectedIndex(oIndex);
    setIsAnswered(true);
    setLastIsCorrect(isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "TRUE_OR_FALSE",
        selected_index: oIndex,
        correct_index: expectedIdx,
        is_correct: isCorrect,
      },
    ]);
  };

  // 3. Multiple Select Toggle & Submit
  const toggleMultiSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedMultiIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSubmitMultiSelect = () => {
    if (isAnswered || selectedMultiIndices.length === 0) return;

    const correct = (currentQ.correct_answers && currentQ.correct_answers.length > 0)
      ? currentQ.correct_answers
      : [currentQ.correct_answer_index];

    const sortedSelected = [...selectedMultiIndices].sort();
    const sortedCorrect = [...correct].sort();

    const isCorrect =
      sortedSelected.length === sortedCorrect.length &&
      sortedSelected.every((val, i) => val === sortedCorrect[i]);

    setIsAnswered(true);
    setLastIsCorrect(isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "MULTIPLE_SELECT",
        selected_indices: selectedMultiIndices,
        correct_index: currentQ.correct_answer_index,
        is_correct: isCorrect,
      },
    ]);
  };

  // 4. Matching Pairing & Submit (Strict 1-to-1 unique match rule)
  const handleSetPairMatch = (leftItem: string, rightItem: string) => {
    if (isAnswered) return;
    setUserMatches((prev) => {
      const next = { ...prev };
      // Strict 1-to-1: if rightItem was already paired with another left item, remove it
      Object.keys(next).forEach((k) => {
        if (next[k] === rightItem) {
          delete next[k];
        }
      });
      next[leftItem] = rightItem;
      return next;
    });
    setSelectedMatchingChip(null);
    setDraggedMatchingChip(null);
  };

  const handleUnassignPairMatch = (leftItem: string) => {
    if (isAnswered) return;
    setUserMatches((prev) => {
      const next = { ...prev };
      delete next[leftItem];
      return next;
    });
  };

  const handleSubmitMatching = () => {
    if (isAnswered) return;
    const pairs = currentQ.matching_pairs || [];
    if (pairs.length === 0) return;

    let allCorrect = true;
    for (const pair of pairs) {
      if (userMatches[pair.left] !== pair.right) {
        allCorrect = false;
        break;
      }
    }

    setIsAnswered(true);
    setLastIsCorrect(allCorrect);

    if (allCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "MATCHING",
        user_matches: userMatches,
        is_correct: allCorrect,
      },
    ]);
  };

  // 5. Reorder Steps & Submit (Tap-to-Swap, Drag-and-Drop, Button Shifting)
  const moveOrderItem = (index: number, direction: "up" | "down") => {
    if (isAnswered) return;
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= userOrder.length) return;
    const updated = [...userOrder];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setUserOrder(updated);
  };

  const handleTapReorderItem = (idx: number) => {
    if (isAnswered) return;
    if (selectedReorderIndex === null) {
      setSelectedReorderIndex(idx);
    } else if (selectedReorderIndex === idx) {
      setSelectedReorderIndex(null);
    } else {
      // Swap the two items directly
      const next = [...userOrder];
      const temp = next[selectedReorderIndex];
      next[selectedReorderIndex] = next[idx];
      next[idx] = temp;
      setUserOrder(next);
      setSelectedReorderIndex(null);
      playSound("correct");
    }
  };

  const handleDragStartReorder = (e: React.DragEvent, idx: number) => {
    if (isAnswered) return;
    setDraggedReorderIndex(idx);
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverReorder = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropReorder = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (isAnswered) return;
    const sourceIdx = draggedReorderIndex ?? parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(sourceIdx) && sourceIdx !== targetIdx && sourceIdx >= 0 && sourceIdx < userOrder.length) {
      const next = [...userOrder];
      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      setUserOrder(next);
      playSound("correct");
    }
    setDraggedReorderIndex(null);
  };

  const handleSubmitReorder = () => {
    if (isAnswered) return;
    const originalItems = currentQ.reorder_items || [];
    const correctOrder = currentQ.correct_order || [];

    let isCorrect = true;
    if (originalItems.length > 0) {
      let expectedItems = [...originalItems];
      if (correctOrder.length === originalItems.length) {
        expectedItems = [...originalItems]
          .map((item, i) => ({ item, order: correctOrder[i] || i + 1 }))
          .sort((a, b) => a.order - b.order)
          .map((x) => x.item);
      }

      isCorrect = expectedItems.every((val, i) => val === userOrder[i]);
    }

    setIsAnswered(true);
    setLastIsCorrect(isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "REORDER",
        user_order: userOrder.map((item) => originalItems.indexOf(item) + 1),
        is_correct: isCorrect,
      },
    ]);
  };

  // 6. Fill In The Blanks Submit (Multi-Blank & Single-Blank Support)
  const handleSubmitFillIn = () => {
    if (isAnswered) return;

    const { blankCount } = parseBlanksFromText(currentQ.question_text);

    // Validate that all blanks have at least some input
    const allFilled = Array.from({ length: blankCount }).every((_, i) => {
      const val = blankCount === 1 ? (userMultiBlanks[0] ?? userText) : (userMultiBlanks[i] ?? "");
      return val.trim().length > 0;
    });
    if (!allFilled) return;

    const results: { isCorrect: boolean; key: string }[] = [];
    let allCorrect = true;

    for (let i = 0; i < blankCount; i++) {
      const userVal = (blankCount === 1 ? (userMultiBlanks[0] ?? userText) : (userMultiBlanks[i] ?? ""))
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:]+$/, "");
      const expectedKeywords = getExpectedKeywordsForBlank(currentQ, i, blankCount);

      const isMatch = expectedKeywords.some((kw) => {
        return kw.trim().toLowerCase().replace(/[.,!?;:]+$/, "") === userVal;
      });

      if (!isMatch) allCorrect = false;
      results.push({
        isCorrect: isMatch,
        key: expectedKeywords.join(" / ") || (currentQ.options?.[i] || "Sesuai materi"),
      });
    }

    setMultiBlankResults(results);
    setIsAnswered(true);
    setLastIsCorrect(allCorrect);

    if (allCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    const formattedAnswer =
      blankCount > 1
        ? Object.entries(userMultiBlanks)
            .map(([idx, val]) => `Isian (${Number(idx) + 1}): ${val.trim()}`)
            .join(" | ")
        : (userMultiBlanks[0] ?? userText).trim();

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "FILL_IN_THE_BLANKS",
        user_text: formattedAnswer,
        is_correct: allCorrect,
      },
    ]);
  };

  // 7. Open-Ended / Essay Submit
  const handleSubmitOpenEnded = () => {
    if (isAnswered || !userText.trim()) return;

    // Open-ended is marked completed and awards 1 point, rubric is shown for reflection
    setIsAnswered(true);
    setLastIsCorrect(true);
    playSound("correct");
    setScore((prev) => prev + 1);

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "OPEN_ENDED",
        user_text: userText.trim(),
        is_correct: true,
      },
    ]);
  };

  // 8. Math / STEM Submit
  const handleSubmitMath = () => {
    if (isAnswered || !userText.trim()) return;

    const rawExpected =
      (currentQ.options && typeof currentQ.correct_answer_index === "number"
        ? currentQ.options[currentQ.correct_answer_index]
        : "") || currentQ.math_solution || "";

    const cleanUser = userText.trim().replace(/\s+/g, "").toLowerCase();
    const cleanExpected = rawExpected.trim().replace(/\s+/g, "").toLowerCase();

    // Strip common math prefixes like "x=", "y=", "jawaban:", "hasil="
    const stripPrefix = (str: string) => str.replace(/^([a-z]=|jawaban:|hasil:)/i, "").trim();
    const valUser = stripPrefix(cleanUser);
    const valExpected = stripPrefix(cleanExpected);

    // Numeric comparison if both evaluate to valid numbers
    const numUser = parseFloat(valUser);
    const numExpected = parseFloat(valExpected);
    const isNumEqual =
      !isNaN(numUser) && !isNaN(numExpected) && Math.abs(numUser - numExpected) < 1e-6;

    // String exact match on original or prefix-stripped value
    const isStrEqual = cleanUser === cleanExpected || valUser === valExpected;

    const isCorrect = isNumEqual || isStrEqual;

    setIsAnswered(true);
    setLastIsCorrect(isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "MATH_RESPONSE",
        user_text: userText.trim(),
        is_correct: isCorrect,
      },
    ]);
  };

  // 9. Image Labeling Submit
  const handleAssignLabelPin = (pinId: string, label: string) => {
    if (isAnswered) return;
    setUserLabelMatches((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === label) delete next[k];
      });
      next[pinId] = label;
      return next;
    });
    setSelectedLabelChip(null);
  };

  const handleSubmitLabeling = () => {
    if (isAnswered) return;
    const pins = currentQ.label_targets || [];
    if (pins.length === 0) return;

    let allCorrect = true;
    for (const pin of pins) {
      if (userLabelMatches[pin.id] !== pin.label) {
        allCorrect = false;
        break;
      }
    }

    setIsAnswered(true);
    setLastIsCorrect(allCorrect);

    if (allCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "IMAGE_LABELING",
        user_label_matches: userLabelMatches,
        is_correct: allCorrect,
      },
    ]);
  };

  // 10. Image Hotspot Submit
  const handleSubmitHotspot = () => {
    if (isAnswered || !userHotspotCoords) return;

    const zone = currentQ.hotspot_zone || { x: 50, y: 50, radius: 15 };
    const dist = Math.hypot(userHotspotCoords.x - zone.x, userHotspotCoords.y - zone.y);
    const isCorrect = dist <= (zone.radius || 15);

    setIsAnswered(true);
    setLastIsCorrect(isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "IMAGE_HOTSPOT",
        user_hotspot_coords: userHotspotCoords,
        is_correct: isCorrect,
      },
    ]);
  };

  // 11. Categorize Items Submit
  const handleAssignItemCategory = (itemText: string, category: string) => {
    if (isAnswered) return;
    setUserCategorization((prev) => {
      const next: Record<string, string[]> = {};
      Object.keys(prev).forEach((cat) => {
        next[cat] = (prev[cat] || []).filter((t) => t !== itemText);
      });
      next[category] = [...(next[category] || []), itemText];
      return next;
    });
    setSelectedCategoryItem(null);
  };

  const handleSubmitCategorization = () => {
    if (isAnswered) return;
    const items = currentQ.categorize_items || [];
    if (items.length === 0) return;

    let allCorrect = true;
    for (const item of items) {
      if (!userCategorization[item.category]?.includes(item.text)) {
        allCorrect = false;
        break;
      }
    }

    setIsAnswered(true);
    setLastIsCorrect(allCorrect);

    if (allCorrect) {
      playSound("correct");
      setScore((prev) => prev + 1);
    } else {
      playSound("wrong");
    }

    setAnswersList((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        question_text: currentQ.question_text,
        question_type: "CATEGORIZE_ITEMS",
        user_categorization: userCategorization,
        is_correct: allCorrect,
      },
    ]);
  };

  // Next Question / Complete Handler
  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      setIsSubmitting(true);

      try {
        await fetch("/api/submit-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quiz_id: quiz?.id,
            student_name: studentName,
            score,
            total_questions: questions.length,
            answers: answersList,
          }),
        });
      } catch (err) {
        console.error("Submission failed:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Restart Quiz
  const handleRestart = () => {
    setQuizStarted(false);
    setCurrentIndex(0);
    setScore(0);
    setAnswersList([]);
    setIsCompleted(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-600 font-semibold">Loading quiz experience...</p>
      </div>
    );
  }

  if (errorMsg || !quiz) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-red-200 text-center space-y-4 shadow-xs">
        <XCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Quiz Not Found</h2>
        <p className="text-sm text-slate-600">{errorMsg || "Invalid quiz URL."}</p>
      </div>
    );
  }

  // 1. WELCOME SCREEN
  if (!quizStarted) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6 animate-pop">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-md border-2 border-caplos-blue bg-white flex items-center justify-center mx-auto transition-transform hover:scale-105">
            <img src="/logo.png" alt="Caplos Mascot" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-caplos-yellow/20 text-caplos-navy border border-caplos-yellow/50 mb-1">
              <span>Caplos Learning Quiz</span>
            </div>
            <h1 className="text-2xl font-black text-caplos-navy pt-1">{quiz.title}</h1>
            <p className="text-sm text-caplos-navy-500 font-medium">
              {questions.length} Butir Soal • Kuis Interaktif Mandiri
            </p>
          </div>
        </div>

        {quiz.status === "draft" && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold">Mode Pratinjau Guru (Draft)</span>
                <p className="text-[11px] text-amber-700 font-normal">
                  Kuis ini masih berstatus Draft. Siswa akan melihat tanda pratinjau ini hingga Anda mempublikasikannya.
                </p>
              </div>
            </div>
            {!isDemo && (
              <button
                type="button"
                onClick={handlePublishNow}
                disabled={isPublishingFromRunner}
                className="px-3.5 py-2 rounded-xl bg-caplos-blue hover:bg-caplos-blue-600 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isPublishingFromRunner ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mempublikasikan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-caplos-yellow" />
                    <span>Publikasikan Sekarang</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {isDemo && (
          <div className="bg-gradient-to-br from-blue-50/80 via-amber-50/40 to-sky-50 border-2 border-caplos-blue/30 rounded-2xl p-4 text-left space-y-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-2xl shrink-0">✨</span>
              <div>
                <h3 className="text-sm font-black text-caplos-navy">Mode Eksplorasi Demo Interaktif</h3>
                <p className="text-xs text-caplos-navy-600 font-medium leading-relaxed">
                  Rasakan langsung 8 variasi tipe soal interaktif Caplos yang seru, dinamis, dan dirancang khusus agar siswa antusias belajar:
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-blue-800 border border-blue-200/80 shadow-2xs flex items-center gap-1.5">
                <span>🔘</span> Pilihan Ganda
              </div>
              <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-amber-800 border border-amber-200/80 shadow-2xs flex items-center gap-1.5">
                <span>🔄</span> Urutan Langkah
              </div>
              <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-purple-800 border border-purple-200/80 shadow-2xs flex items-center gap-1.5">
                <span>🧩</span> Menjodohkan
              </div>
              <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-indigo-800 border border-indigo-200/80 shadow-2xs flex items-center gap-1.5">
                <span>☑️</span> PG Kompleks
              </div>
              <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-emerald-800 border border-emerald-200/80 shadow-2xs flex items-center gap-1.5">
                <span>✏️</span> Isian Rumpang
              </div>
              <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-teal-800 border border-teal-200/80 shadow-2xs flex items-center gap-1.5">
                <span>📦</span> Pengelompokan
              </div>
              <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-rose-800 border border-rose-200/80 shadow-2xs flex items-center gap-1.5">
                <span>⚖️</span> Benar / Salah
              </div>
              <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-cyan-800 border border-cyan-200/80 shadow-2xs flex items-center gap-1.5">
                <span>🔢</span> Matematika
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (studentName.trim()) setQuizStarted(true);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-caplos-navy-600 mb-1.5">
              Masukkan Nama Lengkap Siswa
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Contoh: Budi Pratama"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-300 text-caplos-navy font-semibold focus:ring-2 focus:ring-caplos-blue focus:border-caplos-blue focus:outline-hidden text-base shadow-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!studentName.trim()}
            className="w-full py-4 rounded-2xl bg-caplos-blue text-white font-black text-lg shadow-lg shadow-caplos-blue/30 hover:bg-caplos-blue-600 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Mulai Kuis</span>
            <ArrowRight className="w-5 h-5 text-caplos-yellow" />
          </button>
        </form>
      </div>
    );
  }

  // 3. COMPLETION SCREEN
  if (isCompleted) {
    const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    return (
      <div className="max-w-xl mx-auto my-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6 animate-pop">
        {quiz.status === "draft" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>Teacher Preview Mode: Kuis ini tersimpan sebagai draft.</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
              Draft
            </span>
          </div>
        )}

        <div className="w-20 h-20 bg-gradient-to-tr from-caplos-yellow-400 to-caplos-yellow text-caplos-navy rounded-full flex items-center justify-center mx-auto shadow-lg border-2 border-caplos-yellow-200">
          <Trophy className="w-10 h-10 text-caplos-navy" />
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-black text-caplos-navy">Kuis Selesai!</h2>
          <p className="text-caplos-navy-600 text-sm font-medium">Hebat sekali, {studentName}!</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-caplos-blue-50 border border-caplos-blue-200 rounded-2xl">
            <span className="block text-xs font-bold uppercase text-caplos-blue-700">Skor Kamu</span>
            <span className="text-3xl font-black text-caplos-blue">
              {score} / {questions.length}
            </span>
          </div>

          <div className="p-4 bg-caplos-yellow-50 border border-caplos-yellow-200 rounded-2xl">
            <span className="block text-xs font-bold uppercase text-caplos-yellow-700">Akurasi</span>
            <span className="text-3xl font-black text-caplos-navy">{accuracy}%</span>
          </div>
        </div>

        {isSubmitting && (
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Saving results...
          </p>
        )}

        <button
          onClick={handleRestart}
          className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Retake Quiz</span>
        </button>
      </div>
    );
  }

  // 2. QUESTION RUNNER
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  const optionColors = [
    { bg: "bg-indigo-600", hover: "hover:bg-indigo-700" },
    { bg: "bg-purple-600", hover: "hover:bg-purple-700" },
    { bg: "bg-amber-600", hover: "hover:bg-amber-700" },
    { bg: "bg-emerald-600", hover: "hover:bg-emerald-700" },
    { bg: "bg-rose-600", hover: "hover:bg-rose-700" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Teacher Preview Mode Banner */}
      {quiz.status === "draft" && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-bold">Mode Pratinjau Guru (Draft)</span>
              <p className="text-[11px] text-amber-700 font-normal">
                Kuis ini masih berstatus Draft. Klik publikasikan agar siswa melihat versi kuis resmi.
              </p>
            </div>
          </div>
          {!isDemo && (
            <button
              type="button"
              onClick={handlePublishNow}
              disabled={isPublishingFromRunner}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isPublishingFromRunner ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mempublikasikan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Publikasikan Sekarang</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Top Runner Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="flex items-center gap-1.5 text-indigo-600 font-extrabold bg-indigo-50 px-3 py-1 rounded-full">
            <Award className="w-4 h-4" /> Score: {score}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6 animate-pop">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border shadow-2xs ${
              QUESTION_TYPE_CONFIG[currentType]?.color || "bg-indigo-50 border-indigo-100 text-indigo-700"
            }`}
          >
            <span>{QUESTION_TYPE_CONFIG[currentType]?.icon || "📝"}</span>
            <span>{QUESTION_TYPE_CONFIG[currentType]?.label || currentType.replace(/_/g, " ")}</span>
          </span>
          {isAnswered && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                lastIsCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}
            >
              {lastIsCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{lastIsCorrect ? "Benar (+1 Point)" : "Kurang Tepat"}</span>
            </span>
          )}
        </div>

        {currentType === "FILL_IN_THE_BLANKS" ? (
          <KidFriendlyQuestionText
            text={currentQ.question_text}
            renderPrompt={(promptText) => {
              const { blankCount, parts } = parseBlanksFromText(promptText);
              return (
                <div className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
                  {parts.map((part, pIdx) => {
                    if (part.type === "text") {
                      return <span key={pIdx}>{part.content}</span>;
                    }
                    const bIdx = part.blankIndex ?? 0;
                    const typedVal = blankCount === 1 ? (userMultiBlanks[0] ?? userText) : (userMultiBlanks[bIdx] ?? "");
                    const res = multiBlankResults[bIdx];

                    if (isAnswered && res) {
                      return (
                        <span
                          key={pIdx}
                          className={`inline-flex items-center gap-1.5 mx-1 px-3 py-1 rounded-xl text-base md:text-lg font-bold shadow-xs transition-all ${
                            res.isCorrect
                              ? "bg-emerald-100 text-emerald-900 border-2 border-emerald-400"
                              : "bg-red-100 text-red-900 border-2 border-red-400 line-through"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white text-xs flex items-center justify-center font-extrabold shrink-0">
                            {bIdx + 1}
                          </span>
                          <span>{typedVal.trim() || "(kosong)"}</span>
                          {res.isCorrect ? (
                            <Check className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <X className="w-4 h-4 text-red-700" />
                          )}
                        </span>
                      );
                    }

                    return (
                      <span
                        key={pIdx}
                        className={`inline-flex items-center gap-1.5 mx-1 px-3 py-1 rounded-xl text-base md:text-lg font-bold transition-all shadow-xs ${
                          typedVal.trim()
                            ? "bg-teal-100 text-teal-950 border-2 border-teal-400 scale-[1.02]"
                            : "bg-amber-100 text-amber-900 border-2 border-dashed border-amber-400 animate-pulse"
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
                          {bIdx + 1}
                        </span>
                        <span>{typedVal.trim() || `[ Isian ${bIdx + 1} ]`}</span>
                      </span>
                    );
                  })}
                </div>
              );
            }}
          />
        ) : (
          <KidFriendlyQuestionText text={currentQ.question_text} />
        )}

        {/* Diagram Image */}
        {currentQ.image_url && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentQ.image_url}
              alt={currentQ.alt_text || "Diagram visual soal"}
              className="max-h-64 mx-auto rounded-xl object-contain bg-white p-2 border border-slate-200"
            />
          </div>
        )}

        {/* ======================= TYPE 1: MULTIPLE CHOICE ======================= */}
        {currentType === "MULTIPLE_CHOICE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {(
              currentQ.options && currentQ.options.length >= 2
                ? currentQ.options
                : currentQ.options && currentQ.options.length === 1
                ? [currentQ.options[0], "Pilihan B", "Pilihan C", "Pilihan D"]
                : ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]
            ).map((optionText, oIdx) => {
              const isSelected = selectedIndex === oIdx;
              const isCorrectOption = oIdx === (currentQ.correct_answer_index ?? 0);
              const colorScheme = optionColors[oIdx % optionColors.length];

              let buttonStyle = `${colorScheme.bg} text-white ${colorScheme.hover}`;

              if (isAnswered) {
                if (isCorrectOption) {
                  buttonStyle = "bg-emerald-600 text-white ring-4 ring-emerald-300 animate-pop";
                } else if (isSelected && !isCorrectOption) {
                  buttonStyle = "bg-red-600 text-white ring-4 ring-red-300 animate-shake";
                } else {
                  buttonStyle = "bg-slate-300 text-slate-600 opacity-60";
                }
              }

              return (
                <button
                  key={oIdx}
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(oIdx)}
                  className={`p-5 rounded-2xl font-semibold text-left text-base shadow-md transition-all transform active:scale-95 flex items-center justify-between gap-3 ${buttonStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    {currentQ.option_items?.[oIdx]?.image_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={currentQ.option_items[oIdx].image_url}
                        alt={currentQ.option_items[oIdx].alt_text || `Pilihan ${String.fromCharCode(65 + oIdx)}`}
                        className="w-14 h-14 rounded-lg object-cover bg-white/10 p-0.5 border border-white/20 shrink-0"
                      />
                    )}
                    {optionText ? <span>{optionText}</span> : null}
                  </div>

                  {isAnswered && isCorrectOption && <Check className="w-6 h-6 shrink-0 text-white" />}
                  {isAnswered && isSelected && !isCorrectOption && (
                    <X className="w-6 h-6 shrink-0 text-white" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ======================= TYPE 2: TRUE / FALSE ======================= */}
        {currentType === "TRUE_OR_FALSE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[
              { label: "Benar", idx: 0, color: "bg-emerald-600 hover:bg-emerald-700" },
              { label: "Salah", idx: 1, color: "bg-rose-600 hover:bg-rose-700" },
            ].map((item) => {
              const isSelected = selectedIndex === item.idx;
              let expectedIdx = currentQ.correct_answer_index ?? 0;
              if (currentQ.options && currentQ.options.length === 2) {
                const optText = currentQ.options[expectedIdx]?.toLowerCase() || "";
                if (optText.includes("salah") || optText.includes("false")) {
                  expectedIdx = 1;
                } else if (optText.includes("benar") || optText.includes("true")) {
                  expectedIdx = 0;
                }
              }
              const isCorrectOption = item.idx === expectedIdx;

              let style = `${item.color} text-white`;
              if (isAnswered) {
                if (isCorrectOption) {
                  style = "bg-emerald-600 text-white ring-4 ring-emerald-300";
                } else if (isSelected && !isCorrectOption) {
                  style = "bg-red-600 text-white ring-4 ring-red-300 animate-shake";
                } else {
                  style = "bg-slate-300 text-slate-600 opacity-60";
                }
              }

              return (
                <button
                  key={item.idx}
                  disabled={isAnswered}
                  onClick={() => handleSelectTrueFalse(item.idx)}
                  className={`p-6 rounded-2xl font-bold text-center text-xl shadow-md transition-all active:scale-95 ${style}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ======================= TYPE 3: MULTIPLE SELECT ======================= */}
        {currentType === "MULTIPLE_SELECT" && (
          <div className="space-y-4 pt-2">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-purple-600 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-purple-950">
                  Pilihan Ganda Kompleks: Pilih semua opsi yang benar, lalu tekan &quot;Kirim Jawaban&quot;.
                </span>
              </div>
              <span className="text-xs font-black text-purple-800 bg-purple-100 border border-purple-200 px-3 py-1 rounded-full shrink-0">
                {selectedMultiIndices.length} Dipilih
              </span>
            </div>

            <div className="space-y-2.5">
              {currentQ.options.map((opt, oIdx) => {
                const isChecked = selectedMultiIndices.includes(oIdx);
                const isCorrect = (currentQ.correct_answers || [currentQ.correct_answer_index ?? 0]).includes(oIdx);

                let cardStyle = isChecked
                  ? "bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-300 font-semibold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-purple-300";

                if (isAnswered) {
                  if (isCorrect) {
                    cardStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-300";
                  } else if (isChecked && !isCorrect) {
                    cardStyle = "bg-red-50 border-red-400 text-red-900 ring-2 ring-red-300";
                  } else {
                    cardStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => toggleMultiSelect(oIdx)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${cardStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-purple-600 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                      <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      {currentQ.option_items?.[oIdx]?.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={currentQ.option_items[oIdx].image_url}
                          alt={currentQ.option_items[oIdx].alt_text || `Pilihan ${String.fromCharCode(65 + oIdx)}`}
                          className="w-12 h-12 rounded-lg object-cover bg-white p-0.5 border border-slate-200 shrink-0"
                        />
                      )}
                      <span className="font-semibold text-sm">
                        {opt}
                      </span>
                    </div>

                    {isAnswered && isCorrect && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Kunci Benar</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {!isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={selectedMultiIndices.length === 0}
                  onClick={handleSubmitMultiSelect}
                  className="px-6 py-3.5 bg-purple-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Jawaban ({selectedMultiIndices.length} opsi dipilih)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================= TYPE 4: MATCHING ======================= */}
        {currentType === "MATCHING" && (
          <div className="space-y-5 pt-2">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-950">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">
                  Tarik (*drag*) kartu pasangan di bawah ke kotak target, atau ketuk kartu lalu ketuk kotak yang dituju:
                </span>
              </div>
              <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full shrink-0">
                {Object.keys(userMatches).length} / {currentQ.matching_pairs?.length || 0} Terpasang
              </span>
            </div>

            {/* Target Slots Grid */}
            <div className="space-y-3">
              {(currentQ.matching_pairs || []).map((pair, pIdx) => {
                const selectedVal = userMatches[pair.left] || "";
                const isMatchCorrect = isAnswered && selectedVal === pair.right;
                const isDropTargetActive = selectedMatchingChip && !isAnswered && !selectedVal;

                return (
                  <div
                    key={pIdx}
                    className={`p-4 rounded-2xl border-2 transition-all grid grid-cols-1 sm:grid-cols-2 gap-3 items-center shadow-xs ${
                      isAnswered
                        ? isMatchCorrect
                          ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200"
                          : "bg-red-50/80 border-red-300 ring-2 ring-red-200"
                        : "bg-white border-slate-200 hover:border-amber-300"
                    }`}
                  >
                    {/* Left Stimulus */}
                    <div className="font-bold text-sm text-slate-800 flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs flex items-center justify-center font-black shrink-0">
                        {pIdx + 1}
                      </span>
                      <span>{pair.left}</span>
                    </div>

                    {/* Right Match Slot */}
                    <div>
                      {isAnswered ? (
                        <div className="space-y-1">
                          <div
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between ${
                              isMatchCorrect
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-red-600 text-white shadow-xs"
                            }`}
                          >
                            <span>{selectedVal || "(Tidak dijawab)"}</span>
                            {isMatchCorrect ? (
                              <Check className="w-4 h-4 text-emerald-100 shrink-0" />
                            ) : (
                              <X className="w-4 h-4 text-red-100 shrink-0" />
                            )}
                          </div>
                          {!isMatchCorrect && (
                            <p className="text-xs font-bold text-emerald-700 pl-1">
                              ✓ Kunci Benar: {pair.right}
                            </p>
                          )}
                        </div>
                      ) : selectedVal ? (
                        /* Slotted Item Card */
                        <div className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-between gap-2 animate-pop">
                          <div className="flex items-center gap-2 truncate">
                            <Check className="w-4 h-4 text-amber-200 shrink-0" />
                            <span className="truncate">{selectedVal}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnassignPairMatch(pair.left)}
                            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xs font-black transition shrink-0"
                            title="Lepas pasangan (kembalikan ke wadah)"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        /* Empty Drop Target Slot */
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dropped = e.dataTransfer.getData("text/plain") || draggedMatchingChip;
                            if (dropped) handleSetPairMatch(pair.left, dropped);
                          }}
                          onClick={() => {
                            if (selectedMatchingChip) {
                              handleSetPairMatch(pair.left, selectedMatchingChip);
                            }
                          }}
                          className={`p-3 rounded-xl border-2 border-dashed transition-all flex items-center justify-between text-xs font-bold cursor-pointer select-none ${
                            isDropTargetActive
                              ? "border-amber-500 bg-amber-100/70 text-amber-900 ring-2 ring-amber-300 animate-pulse"
                              : "border-slate-300 bg-slate-50/80 text-slate-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800"
                          }`}
                        >
                          <span>
                            {selectedMatchingChip
                              ? "+ Ketuk di sini untuk memasangkan"
                              : "Tarik kartu ke sini atau pilih di bawah"}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Available Right Items Pool (Only shown before submitting) */}
            {!isAnswered && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 block">
                    Pilihan Kartu Pasangan (Tarik atau Ketuk Kartu):
                  </span>
                  {selectedMatchingChip && (
                    <button
                      type="button"
                      onClick={() => setSelectedMatchingChip(null)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Batalkan Pilihan Kartu
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {(shuffledMatchingOptions.length > 0
                    ? shuffledMatchingOptions
                    : (currentQ.matching_pairs || []).map((p) => p.right)
                  ).map((rightText, rIdx) => {
                    const isAssigned = Object.values(userMatches).includes(rightText);
                    const isSelected = selectedMatchingChip === rightText;

                    if (isAssigned) {
                      return null; // Opsi yang sudah terpasang disembunyikan dari pool (Strict 1-to-1)
                    }

                    return (
                      <div
                        key={rIdx}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", rightText);
                          setDraggedMatchingChip(rightText);
                        }}
                        onDragEnd={() => setDraggedMatchingChip(null)}
                        onClick={() => setSelectedMatchingChip(isSelected ? null : rightText)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all cursor-grab active:cursor-grabbing select-none flex items-center gap-2 border ${
                          isSelected
                            ? "bg-amber-600 text-white ring-4 ring-amber-300 scale-105 shadow-md"
                            : "bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:shadow-xs"
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5 text-amber-500" />
                        <span>{rightText}</span>
                      </div>
                    );
                  })}

                  {Object.keys(userMatches).length === (currentQ.matching_pairs?.length || 0) && (
                    <p className="text-xs text-emerald-700 font-bold py-1 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Semua pasangan telah terpasang! Anda dapat mengirim jawaban di bawah.</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {!isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  disabled={
                    Object.keys(userMatches).length < (currentQ.matching_pairs?.length || 0)
                  }
                  onClick={handleSubmitMatching}
                  className="px-6 py-3 bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-amber-700 disabled:opacity-40 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Pasangan Jawaban</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================= TYPE 5: REORDER (Ramah Siswa SD) ======================= */}
        {currentType === "REORDER" && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-indigo-50/90 border border-indigo-200 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <ArrowUpDown className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">Cara Mengurutkan (Khusus Siswa SD):</h4>
                  <p className="text-[11px] text-indigo-700">
                    Bisa <strong>geser kartu (drag)</strong>, atau cukup <strong>ketuk kartu lalu ketuk kartu lain untuk bertukar posisi</strong>, atau tekan panah ⬆️ ⬇️.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-indigo-800 bg-white px-2.5 py-1 rounded-full border border-indigo-200 self-start sm:self-auto shrink-0 shadow-xs">
                1 (Awal) ➔ {userOrder.length} (Akhir)
              </span>
            </div>

            {/* Tap-to-Swap Helper Banner */}
            {selectedReorderIndex !== null && !isAnswered && (
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Langkah <strong>#{selectedReorderIndex + 1} ({userOrder[selectedReorderIndex]})</strong> dipilih! Sekarang ketuk langkah lain untuk bertukar posisi.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReorderIndex(null)}
                  className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-100 shrink-0"
                >
                  Batal
                </button>
              </div>
            )}

            {(() => {
              const origItems = currentQ.reorder_items || [];
              const cOrder = currentQ.correct_order || [];
              const expItems =
                cOrder.length === origItems.length && origItems.length > 0
                  ? [...origItems]
                      .map((item, i) => ({ item, order: cOrder[i] || i + 1 }))
                      .sort((a, b) => a.order - b.order)
                      .map((x) => x.item)
                  : origItems;

              return (
                <>
                  <div className="space-y-3">
                    {userOrder.map((item, idx) => {
                      const isPosCorrect = isAnswered && item === expItems[idx];
                      const isSelectedForSwap = selectedReorderIndex === idx;
                      const stepTheme = STEP_COLORS[idx % STEP_COLORS.length];

                      return (
                        <div key={idx} className="flex flex-col items-center">
                          {idx > 0 && (
                            <div className="flex items-center gap-1.5 py-1 text-slate-300">
                              <div className="w-0.5 h-3 bg-slate-200" />
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              <div className="w-0.5 h-3 bg-slate-200" />
                            </div>
                          )}

                          <div
                            draggable={!isAnswered}
                            onDragStart={(e) => handleDragStartReorder(e, idx)}
                            onDragOver={handleDragOverReorder}
                            onDrop={(e) => handleDropReorder(e, idx)}
                            onClick={() => handleTapReorderItem(idx)}
                            className={`w-full p-3.5 md:p-4 border-2 rounded-2xl flex items-center justify-between gap-3 shadow-xs transition-all select-none ${
                              isAnswered
                                ? isPosCorrect
                                  ? "bg-emerald-50/90 border-emerald-400"
                                  : "bg-red-50/90 border-red-400"
                                : isSelectedForSwap
                                ? "bg-amber-50 border-amber-400 ring-4 ring-amber-300 scale-[1.02] shadow-md cursor-pointer"
                                : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-grab active:cursor-grabbing"
                            }`}
                          >
                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                              {!isAnswered && (
                                <div className="text-slate-400 hover:text-indigo-600 shrink-0 cursor-grab">
                                  <GripVertical className="w-5 h-5" />
                                </div>
                              )}

                              <div
                                className={`w-9 h-9 md:w-10 md:h-10 rounded-xl font-extrabold text-sm md:text-base flex items-center justify-center shrink-0 shadow-xs ${
                                  isAnswered
                                    ? isPosCorrect
                                      ? "bg-emerald-500 text-white"
                                      : "bg-red-500 text-white"
                                    : `${stepTheme.bg} ${stepTheme.text}`
                                }`}
                              >
                                {idx + 1}
                              </div>

                              <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Langkah {idx + 1}
                                </span>
                                <span className="font-bold text-sm md:text-base text-slate-800 break-words">
                                  {item}
                                </span>
                              </div>
                            </div>

                            {!isAnswered ? (
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => moveOrderItem(idx, "up")}
                                  disabled={idx === 0}
                                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-20 transition flex items-center justify-center shadow-xs"
                                  title="Geser ke atas"
                                >
                                  <ChevronUp className="w-5 h-5 text-slate-700" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveOrderItem(idx, "down")}
                                  disabled={idx === userOrder.length - 1}
                                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-20 transition flex items-center justify-center shadow-xs"
                                  title="Geser ke bawah"
                                >
                                  <ChevronDown className="w-5 h-5 text-slate-700" />
                                </button>
                              </div>
                            ) : isPosCorrect ? (
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1 shrink-0">
                                <Check className="w-4 h-4 text-emerald-600" /> Posisi Tepat
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-red-800 bg-red-100 border border-red-300 px-3 py-1 rounded-full flex items-center gap-1 shrink-0">
                                <X className="w-4 h-4 text-red-600" /> Posisi Salah
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {isAnswered && !lastIsCorrect && (
                    <div className="p-4 bg-cyan-50 border-2 border-cyan-200 rounded-2xl space-y-2 text-xs text-cyan-950">
                      <span className="font-bold text-cyan-900 flex items-center gap-1.5 text-sm">
                        <Check className="w-4 h-4 text-cyan-700" />
                        <span>Kunci Urutan Tahapan yang Tepat:</span>
                      </span>
                      <ol className="list-decimal list-inside space-y-1 font-semibold pl-1">
                        {expItems.map((it, eIdx) => (
                          <li key={eIdx} className="text-cyan-900">
                            {it}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              );
            })()}

            {!isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSubmitReorder}
                  className="px-6 py-3.5 bg-indigo-600 text-white font-bold text-sm md:text-base rounded-2xl shadow-md hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Urutan Jawaban</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================= TYPE 6: FILL IN THE BLANKS (Multi & Single Blank) ======================= */}
        {currentType === "FILL_IN_THE_BLANKS" && (
          <div className="space-y-4 pt-2">
            {(() => {
              const { blankCount } = parseBlanksFromText(currentQ.question_text);
              const isMulti = blankCount > 1;
              const allFilled = Array.from({ length: blankCount }).every((_, i) => {
                const val = isMulti ? (userMultiBlanks[i] || "") : (userMultiBlanks[0] || userText || "");
                return val.trim().length > 0;
              });

              return (
                <>
                  <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-2.5">
                    <span className="p-2 bg-teal-600 text-white rounded-xl shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-teal-950">
                        {isMulti
                          ? `Soal memiliki ${blankCount} bagian rumpang. Isi setiap kotak di bawah:`
                          : "Isi bagian rumpang dengan kata kunci yang tepat:"}
                      </h4>
                      <p className="text-[11px] text-teal-700">
                        {isMulti
                          ? "Kata yang kamu ketik akan otomatis mengisi kalimat soal di atas secara waktu-nyata."
                          : "Ketik kata jawabanmu di kotak bawah, lalu klik Kirim Isian."}
                      </p>
                    </div>
                  </div>

                  {/* Dedicated Numbered Input Fields */}
                  {isMulti ? (
                    <div className="space-y-3">
                      {Array.from({ length: blankCount }).map((_, bIdx) => {
                        const val = userMultiBlanks[bIdx] || "";
                        const res = multiBlankResults[bIdx];
                        const expKeywords = getExpectedKeywordsForBlank(currentQ, bIdx, blankCount);

                        return (
                          <div
                            key={bIdx}
                            className={`p-4 rounded-2xl border-2 transition-all ${
                              isAnswered
                                ? res?.isCorrect
                                  ? "bg-emerald-50/90 border-emerald-300"
                                  : "bg-red-50/90 border-red-300"
                                : "bg-white border-slate-200 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                  {bIdx + 1}
                                </span>
                                <span className="font-bold text-sm text-slate-800">
                                  Kotak Isian Bagian ({bIdx + 1})
                                </span>
                              </div>
                              {isAnswered && (
                                <span
                                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                    res?.isCorrect
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {res?.isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                  <span>{res?.isCorrect ? "Tepat" : "Kurang Tepat"}</span>
                                </span>
                              )}
                            </div>

                            <input
                              type="text"
                              disabled={isAnswered}
                              value={val}
                              onChange={(e) =>
                                setUserMultiBlanks((prev) => ({ ...prev, [bIdx]: e.target.value }))
                              }
                              placeholder={`Ketik kata untuk isian (${bIdx + 1}) di kalimat atas...`}
                              className="w-full p-3.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-base focus:ring-2 focus:ring-teal-500 focus:outline-hidden disabled:bg-slate-50"
                            />

                            {isAnswered && !res?.isCorrect && (
                              <div className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Kunci Bagian ({bIdx + 1}): <strong>{res?.key || expKeywords.join(" / ")}</strong></span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        disabled={isAnswered}
                        value={userMultiBlanks[0] !== undefined ? userMultiBlanks[0] : userText}
                        onChange={(e) => {
                          setUserText(e.target.value);
                          setUserMultiBlanks({ 0: e.target.value });
                        }}
                        placeholder="Ketik kata kunci jawaban..."
                        className="w-full p-4 rounded-2xl border-2 border-slate-200 text-slate-900 font-semibold text-base focus:border-teal-400 focus:ring-4 focus:ring-teal-100 focus:outline-hidden disabled:bg-slate-50"
                      />

                      {isAnswered && (
                        <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs font-semibold text-teal-900 flex items-center gap-2">
                          <Check className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>
                            Kata Kunci yang Diterima:{" "}
                            <strong className="font-bold">
                              {(currentQ.blanks_keywords || []).join(" / ") ||
                                currentQ.options[currentQ.correct_answer_index] ||
                                "Sesuai materi"}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {!isAnswered && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={!allFilled}
                        onClick={handleSubmitFillIn}
                        className="px-6 py-3.5 bg-teal-600 text-white font-bold text-sm md:text-base rounded-2xl shadow-md hover:bg-teal-700 disabled:opacity-40 transition flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>Kirim Isian Jawaban</span>
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ======================= TYPE 7: OPEN ENDED ======================= */}
        {currentType === "OPEN_ENDED" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-500">
              Tuliskan analisis atau jawaban uraian kamu secara lengkap:
            </p>

            <div className="space-y-3">
              <textarea
                rows={4}
                disabled={isAnswered}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Tulis penjelasan/esai kamu di sini..."
                className="w-full p-4 rounded-2xl border border-slate-300 text-slate-900 font-medium text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />

              {!isAnswered ? (
                <div className="flex justify-end">
                  <button
                    disabled={!userText.trim()}
                    onClick={handleSubmitOpenEnded}
                    className="px-6 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-rose-700 disabled:opacity-40 transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Jawaban Esai</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase">
                    <BookOpen className="w-4 h-4" />
                    <span>Rubrik Penilaian & Poin Kunci:</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-rose-950 space-y-1">
                    {(currentQ.rubric || ["Penjelasan komprehensif", "Penggunaan kata kunci materi"]).map(
                      (item, rIdx) => (
                        <li key={rIdx}>{item}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TYPE 8: MATH RESPONSE ======================= */}
        {currentType === "MATH_RESPONSE" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-500">
              Tuliskan nilai numerik atau formula penyelesaian:
            </p>

            <div className="space-y-3">
              <input
                type="text"
                disabled={isAnswered}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="e.g. 25 atau x = 4"
                className="w-full p-4 rounded-2xl border border-slate-300 font-mono text-slate-900 font-bold text-base focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />

              {!isAnswered ? (
                <div className="flex justify-end">
                  <button
                    disabled={!userText.trim()}
                    onClick={handleSubmitMath}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-40 transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Nilai Matematika</span>
                  </button>
                </div>
              ) : (
                currentQ.math_solution && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1 text-xs text-indigo-950 font-mono">
                    <span className="font-bold text-indigo-800 block uppercase">
                      Langkah Penyelesaian / Solusi:
                    </span>
                    <p>{currentQ.math_solution}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ======================= TYPE 9: IMAGE_LABELING ======================= */}
        {currentType === "IMAGE_LABELING" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-500">
              Pilih kartu label di bawah, lalu ketuk titik penanda (pin) bernomor pada gambar untuk memasangkannya:
            </p>

            {/* Visual Canvas */}
            <div className="relative w-full min-h-[300px] sm:min-h-[360px] bg-slate-900 rounded-3xl overflow-hidden border border-fuchsia-200 shadow-md flex items-center justify-center select-none">
              {currentQ.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentQ.image_url}
                  alt={currentQ.alt_text || "Diagram Labelling"}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="text-center p-6 space-y-2 pointer-events-none">
                  <MapPin className="w-10 h-10 text-fuchsia-400 mx-auto animate-bounce" />
                  <p className="text-sm font-bold text-white">{currentQ.image_context || "Diagram Visual"}</p>
                </div>
              )}

              {/* Pins on image */}
              {(currentQ.label_targets || []).map((pin, pIdx) => {
                const assigned = userLabelMatches[pin.id];
                const isCorrect = isAnswered && assigned === pin.label;

                return (
                  <div
                    key={pin.id || pIdx}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    onClick={() => {
                      if (isAnswered) return;
                      if (selectedLabelChip) {
                        handleAssignLabelPin(pin.id, selectedLabelChip);
                      } else if (assigned) {
                        // Unassign
                        setUserLabelMatches((prev) => {
                          const next = { ...prev };
                          delete next[pin.id];
                          return next;
                        });
                      }
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform hover:scale-110 active:scale-95"
                  >
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs shadow-xl border-2 transition-all ${
                        isAnswered
                          ? isCorrect
                            ? "bg-emerald-600 text-white border-white ring-4 ring-emerald-300"
                            : "bg-red-600 text-white border-white ring-4 ring-red-300"
                          : assigned
                          ? "bg-fuchsia-600 text-white border-white ring-2 ring-fuchsia-400"
                          : selectedLabelChip
                          ? "bg-amber-400 text-slate-900 border-white ring-4 ring-amber-300 animate-pulse"
                          : "bg-white text-slate-900 border-slate-300"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                        {pIdx + 1}
                      </span>
                      <span>{assigned || (pin.target_name ? `(${pin.target_name})` : `Titik #${pIdx + 1}`)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Label Chips Selection Pool */}
            {!isAnswered && (
              <div className="space-y-2 p-3 bg-fuchsia-50/50 border border-fuchsia-200 rounded-2xl">
                <span className="text-xs font-bold text-fuchsia-900 block">
                  Pilih Kartu Label di Bawah:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(shuffledLabelChips.length > 0
                    ? shuffledLabelChips
                    : (currentQ.label_targets || []).map((t) => t.label)
                  ).map((labelText, lIdx) => {
                    const isAssigned = Object.values(userLabelMatches).includes(labelText);
                    const isSelected = selectedLabelChip === labelText;

                    return (
                      <button
                        key={lIdx}
                        type="button"
                        onClick={() => setSelectedLabelChip(isSelected ? null : labelText)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-fuchsia-600 text-white ring-4 ring-fuchsia-300 scale-105"
                            : isAssigned
                            ? "bg-slate-200 text-slate-400 line-through opacity-60"
                            : "bg-white text-slate-800 border border-slate-200 hover:border-fuchsia-400"
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>{labelText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isAnswered ? (
              <div className="flex justify-end pt-2">
                <button
                  disabled={
                    Object.keys(userLabelMatches).length < (currentQ.label_targets?.length || 0)
                  }
                  onClick={handleSubmitLabeling}
                  className="px-6 py-3 bg-fuchsia-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-fuchsia-700 disabled:opacity-40 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Pasangan Label</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Kunci Pasangan Label Gambar:</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(currentQ.label_targets || []).map((pin, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold">
                      Pin #{idx + 1} ({pin.target_name || "Target"}) ➔ <strong className="text-emerald-700">{pin.label}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TYPE 10: IMAGE_HOTSPOT ======================= */}
        {currentType === "IMAGE_HOTSPOT" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-500">
              Ketuk/klik langsung pada area gambar yang sesuai dengan instruksi:
            </p>

            {/* Hotspot Interactive Canvas */}
            <div
              onClick={(e) => {
                if (isAnswered) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                setUserHotspotCoords({ x: clickX, y: clickY });
              }}
              className={`relative w-full min-h-[300px] sm:min-h-[360px] bg-slate-900 rounded-3xl overflow-hidden border border-orange-200 shadow-md flex items-center justify-center select-none ${
                !isAnswered ? "cursor-crosshair" : "cursor-default"
              }`}
            >
              {currentQ.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentQ.image_url}
                  alt={currentQ.alt_text || "Area Target Hotspot"}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="text-center p-6 space-y-2 pointer-events-none">
                  <Target className="w-10 h-10 text-orange-400 mx-auto animate-pulse" />
                  <p className="text-sm font-bold text-white">{currentQ.image_context || "Visual Target Area"}</p>
                </div>
              )}

              {/* Student tapped point */}
              {userHotspotCoords && (
                <div
                  style={{ left: `${userHotspotCoords.x}%`, top: `${userHotspotCoords.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow-xl flex items-center justify-center animate-ping" />
                  <div className="w-4 h-4 rounded-full bg-orange-600 border-2 border-white shadow-xl absolute top-1 left-1" />
                </div>
              )}

              {/* Correct Target Zone (Revealed after submission) */}
              {isAnswered && currentQ.hotspot_zone && (
                <div
                  style={{
                    left: `${currentQ.hotspot_zone.x}%`,
                    top: `${currentQ.hotspot_zone.y}%`,
                    width: `${currentQ.hotspot_zone.radius * 2}%`,
                    height: `${currentQ.hotspot_zone.radius * 2}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 flex items-center justify-center z-10 pointer-events-none animate-pop ${
                    lastIsCorrect ? "border-emerald-400 bg-emerald-500/30" : "border-amber-400 bg-amber-500/30"
                  }`}
                >
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-800 shadow-xs">
                    Zona Target Benar
                  </span>
                </div>
              )}
            </div>

            {!isAnswered ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-500">
                  {userHotspotCoords
                    ? `Titik terpilih: (${userHotspotCoords.x}%, ${userHotspotCoords.y}%)`
                    : "Belum ada titik yang diketuk"}
                </span>
                <button
                  disabled={!userHotspotCoords}
                  onClick={handleSubmitHotspot}
                  className="px-6 py-3 bg-orange-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-orange-700 disabled:opacity-40 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Titik Sentuh</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-950 font-medium">
                <span className="font-bold">Keterangan Zona: </span>
                <span>{currentQ.hotspot_zone?.description || "Area target spesifik yang diminta."}</span>
              </div>
            )}
          </div>
        )}

        {/* ======================= TYPE 11: CATEGORIZE_ITEMS ======================= */}
        {currentType === "CATEGORIZE_ITEMS" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-500">
              Pilih kartu item, lalu klik kelompok kategori untuk memasukkannya:
            </p>

            {/* Unassigned Items Pool */}
            {!isAnswered && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Kartu Item yang Belum Dikelompokkan:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(shuffledCategorizeItems.length > 0
                    ? shuffledCategorizeItems
                    : currentQ.categorize_items || []
                  )
                    .filter((item) => {
                      return !Object.values(userCategorization).some((arr) => arr.includes(item.text));
                    })
                    .map((item, idx) => {
                      const isSelected = selectedCategoryItem === item.text;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCategoryItem(isSelected ? null : item.text)}
                          className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all ${
                            isSelected
                              ? "bg-lime-600 text-white ring-4 ring-lime-300 scale-105"
                              : "bg-white text-slate-800 border border-slate-200 hover:border-lime-400"
                          }`}
                        >
                          {item.text}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Category Buckets Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(currentQ.categories || []).map((cat, cIdx) => {
                const itemsInCat = userCategorization[cat] || [];

                return (
                  <div
                    key={cIdx}
                    onClick={() => {
                      if (!isAnswered && selectedCategoryItem) {
                        handleAssignItemCategory(selectedCategoryItem, cat);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all min-h-[140px] flex flex-col justify-between ${
                      selectedCategoryItem && !isAnswered
                        ? "border-dashed border-lime-500 bg-lime-50/50 cursor-pointer hover:bg-lime-100/60"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-lime-600" />
                          <span>{cat}</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-100 text-lime-800">
                          {itemsInCat.length}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {itemsInCat.map((itemText, iIdx) => {
                          const isItemCorrect =
                            isAnswered &&
                            currentQ.categorize_items?.find((it) => it.text === itemText)?.category === cat;

                          return (
                            <div
                              key={iIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isAnswered) {
                                  setUserCategorization((prev) => ({
                                    ...prev,
                                    [cat]: prev[cat].filter((t) => t !== itemText),
                                  }));
                                }
                              }}
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                                isAnswered
                                  ? isItemCorrect
                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                    : "bg-red-100 text-red-900 border border-red-300"
                                  : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              }`}
                            >
                              <span>{itemText}</span>
                              {!isAnswered && <span className="text-slate-400 text-xs">×</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {!isAnswered && selectedCategoryItem && (
                      <p className="text-[10px] text-lime-700 font-bold text-center mt-2">
                        + Masukkan ke sini
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {!isAnswered ? (
              <div className="flex justify-end pt-2">
                <button
                  disabled={
                    Object.values(userCategorization).reduce((acc, cur) => acc + cur.length, 0) <
                    (currentQ.categorize_items?.length || 0)
                  }
                  onClick={handleSubmitCategorization}
                  className="px-6 py-3 bg-lime-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-lime-700 disabled:opacity-40 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Hasil Pengelompokan</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Kunci Kategori yang Benar:</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(currentQ.categorize_items || []).map((it, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold">
                      {it.text} ➔ <strong className="text-lime-700">{it.category}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explanation Box (Revealed after answer) */}
        {isAnswered && (
          <div className="space-y-4 pt-4 border-t border-slate-100 animate-pop">
            {currentQ.explanation && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm text-indigo-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                  <HelpCircle className="w-4 h-4" />
                  <span>Pembahasan / Penjelasan:</span>
                </div>
                <p>{currentQ.explanation}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleNext}
                className="px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-base shadow-lg hover:bg-indigo-700 transition flex items-center gap-2"
              >
                <span>{currentIndex < questions.length - 1 ? "Next Question" : "See Final Results"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
