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
} from "lucide-react";

const DEMO_QUIZ: Quiz = {
  id: "demo-quiz-id",
  title: "Demo Quiz: Science & General Knowledge",
  slug: "demo",
  created_at: new Date().toISOString(),
};

const DEMO_QUESTIONS: Question[] = [
  {
    id: "q1",
    quiz_id: "demo-quiz-id",
    question_text: "What is the primary source of energy for Earth's climate system?",
    question_type: "MULTIPLE_CHOICE",
    image_url: null,
    options: ["The Sun", "Geothermal vents", "The Moon's gravity", "Nuclear decay"],
    correct_answer_index: 0,
    explanation: "The Sun provides the solar radiation that drives atmospheric circulation and climate on Earth.",
    order_index: 0,
  },
  {
    id: "q2",
    quiz_id: "demo-quiz-id",
    question_text: "Which planet is known as the Red Planet?",
    question_type: "MULTIPLE_CHOICE",
    image_url: null,
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correct_answer_index: 1,
    explanation: "Mars appears reddish due to the prevalence of iron oxide (rust) on its surface.",
    order_index: 1,
  },
  {
    id: "q3",
    quiz_id: "demo-quiz-id",
    question_text: "Tumbuhan menghasilkan oksigen melalui proses fotosintesis.",
    question_type: "TRUE_OR_FALSE",
    image_url: null,
    options: ["Benar", "Salah"],
    correct_answer_index: 0,
    explanation: "Fotosintesis mengubah karbondioksida dan air menjadi glukosa dan oksigen dengan bantuan cahaya matahari.",
    order_index: 2,
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
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [userText, setUserText] = useState<string>("");
  const [userLabelMatches, setUserLabelMatches] = useState<Record<string, string>>({});
  const [selectedLabelChip, setSelectedLabelChip] = useState<string | null>(null);
  const [userHotspotCoords, setUserHotspotCoords] = useState<{ x: number; y: number } | null>(null);
  const [userCategorization, setUserCategorization] = useState<Record<string, string[]>>({});
  const [selectedCategoryItem, setSelectedCategoryItem] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastIsCorrect, setLastIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answersList, setAnswersList] = useState<StudentAnswer[]>([]);

  // Completion state
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Reset answer states when currentIndex or questions change
  useEffect(() => {
    setSelectedIndex(null);
    setSelectedMultiIndices([]);
    setUserMatches({});
    setUserText("");
    setUserLabelMatches({});
    setSelectedLabelChip(null);
    setUserHotspotCoords(null);
    setSelectedCategoryItem(null);
    setIsAnswered(false);
    setLastIsCorrect(false);

    const q = questions[currentIndex];
    if (q) {
      if (q.question_type === "REORDER" && q.reorder_items && q.reorder_items.length > 0) {
        setUserOrder([...q.reorder_items]);
      }
      if (q.question_type === "CATEGORIZE_ITEMS" && q.categories) {
        const initCats: Record<string, string[]> = {};
        q.categories.forEach((c) => {
          initCats[c] = [];
        });
        setUserCategorization(initCats);
      }
    }
  }, [currentIndex, questions]);

  const currentQ = questions[currentIndex];

  const getQuestionType = (q: Question): QuestionType => {
    if (q.question_type) return q.question_type;
    if (q.options?.length === 2 && (q.options[0] === "Benar" || q.options[0] === "True")) {
      return "TRUE_OR_FALSE";
    }
    return "MULTIPLE_CHOICE";
  };

  const currentType = currentQ ? getQuestionType(currentQ) : "MULTIPLE_CHOICE";

  // 1. Single Option Select (MULTIPLE_CHOICE)
  const handleSelectOption = (oIndex: number) => {
    if (isAnswered) return;

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
        question_type: "TRUE_OR_FALSE",
        selected_index: oIndex,
        correct_index: currentQ.correct_answer_index,
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

  // 4. Matching Pairing & Submit
  const handleSetPairMatch = (leftItem: string, rightItem: string) => {
    if (isAnswered) return;
    setUserMatches((prev) => ({ ...prev, [leftItem]: rightItem }));
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

  // 5. Reorder Steps & Submit
  const moveOrderItem = (index: number, direction: "up" | "down") => {
    if (isAnswered) return;
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= userOrder.length) return;
    const updated = [...userOrder];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setUserOrder(updated);
  };

  const handleSubmitReorder = () => {
    if (isAnswered) return;
    const originalItems = currentQ.reorder_items || [];
    const correctOrder = currentQ.correct_order || [];

    let isCorrect = true;
    if (correctOrder.length === originalItems.length && originalItems.length > 0) {
      // Build expected array in order
      const expectedItems = [...originalItems]
        .map((item, i) => ({ item, order: correctOrder[i] || i + 1 }))
        .sort((a, b) => a.order - b.order)
        .map((x) => x.item);

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

  // 6. Fill In The Blanks Submit
  const handleSubmitFillIn = () => {
    if (isAnswered || !userText.trim()) return;

    const keywords = currentQ.blanks_keywords || [];
    const cleanUser = userText.trim().toLowerCase();

    // Match against any keyword or option
    const isCorrect =
      keywords.some((kw) => kw.trim().toLowerCase() === cleanUser) ||
      (currentQ.options && currentQ.options.some((opt) => opt.trim().toLowerCase() === cleanUser));

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
        question_type: "FILL_IN_THE_BLANKS",
        user_text: userText.trim(),
        is_correct: isCorrect,
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

    const expected = currentQ.options[currentQ.correct_answer_index] || currentQ.math_solution || "";
    const cleanUser = userText.trim().replace(/\s+/g, "").toLowerCase();
    const cleanExpected = expected.replace(/\s+/g, "").toLowerCase();

    const isCorrect =
      cleanUser === cleanExpected ||
      cleanExpected.includes(cleanUser) ||
      (cleanUser.length > 0 && cleanExpected.startsWith(cleanUser));

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
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 pt-2">{quiz.title}</h1>
          <p className="text-sm text-slate-500">
            {questions.length} Question{questions.length !== 1 ? "s" : ""} • Interactive Self-Paced Quiz
          </p>
        </div>

        {quiz.status === "draft" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>Teacher Preview Mode: This quiz is currently saved as a draft.</span>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Enter Your Name / Nama Lengkap
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Budi Pratama"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!studentName.trim()}
            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            <span>Start Quiz</span>
            <ArrowRight className="w-5 h-5" />
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
              <span>Teacher Preview Mode: This quiz is currently saved as a draft.</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
              Draft
            </span>
          </div>
        )}

        <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900">Quiz Completed!</h2>
          <p className="text-slate-500 text-sm">Great job, {studentName}!</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <span className="block text-xs font-bold uppercase text-indigo-500">Score</span>
            <span className="text-3xl font-black text-indigo-700">
              {score} / {questions.length}
            </span>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
            <span className="block text-xs font-bold uppercase text-purple-500">Accuracy</span>
            <span className="text-3xl font-black text-purple-700">{accuracy}%</span>
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
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Teacher Preview Mode: This quiz is currently saved as a draft.</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
            Draft Preview
          </span>
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
          <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">
            {currentType.replace(/_/g, " ")}
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

        <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
          {currentQ.question_text}
        </h2>

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
            {currentQ.options.map((optionText, oIdx) => {
              const isSelected = selectedIndex === oIdx;
              const isCorrectOption = oIdx === currentQ.correct_answer_index;
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
              const isCorrectOption = item.idx === currentQ.correct_answer_index;

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
            <p className="text-xs font-semibold text-slate-500">
              Pilih semua jawaban yang benar (Minimal 2 opsi):
            </p>
            <div className="space-y-2.5">
              {currentQ.options.map((opt, oIdx) => {
                const isChecked = selectedMultiIndices.includes(oIdx);
                const isCorrect = (currentQ.correct_answers || []).includes(oIdx);

                let cardStyle = isChecked
                  ? "bg-purple-50 border-purple-400 text-purple-900"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";

                if (isAnswered) {
                  if (isCorrect) {
                    cardStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold";
                  } else if (isChecked && !isCorrect) {
                    cardStyle = "bg-red-50 border-red-400 text-red-900";
                  } else {
                    cardStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={oIdx}
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
                      {currentQ.option_items?.[oIdx]?.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={currentQ.option_items[oIdx].image_url}
                          alt={currentQ.option_items[oIdx].alt_text || `Pilihan ${String.fromCharCode(65 + oIdx)}`}
                          className="w-12 h-12 rounded-lg object-cover bg-white p-0.5 border border-slate-200 shrink-0"
                        />
                      )}
                      <span className="font-semibold text-sm">
                        <span className="font-bold mr-2 text-slate-400">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        {opt}
                      </span>
                    </div>

                    {isAnswered && isCorrect && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Kunci
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {!isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  disabled={selectedMultiIndices.length < 2}
                  onClick={handleSubmitMultiSelect}
                  className="px-6 py-3 bg-purple-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-purple-700 disabled:opacity-40 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Jawaban ({selectedMultiIndices.length} dipilih)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================= TYPE 4: MATCHING ======================= */}
        {currentType === "MATCHING" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-500">
              Jodohkan item di kolom kiri dengan pasangan yang tepat di kolom kanan:
            </p>

            <div className="space-y-3">
              {(currentQ.matching_pairs || []).map((pair, pIdx) => {
                const selectedVal = userMatches[pair.left] || "";
                const isMatchCorrect = isAnswered && selectedVal === pair.right;

                return (
                  <div
                    key={pIdx}
                    className={`p-4 rounded-2xl border transition grid grid-cols-1 sm:grid-cols-2 gap-3 items-center ${
                      isAnswered
                        ? isMatchCorrect
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-red-50 border-red-300"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center font-bold shrink-0">
                        {pIdx + 1}
                      </span>
                      <span>{pair.left}</span>
                    </div>

                    <div>
                      {isAnswered ? (
                        <div className="text-xs font-bold text-slate-700 flex flex-col gap-0.5">
                          <span>Jawaban Kamu: {selectedVal || "(Belum dipilih)"}</span>
                          {!isMatchCorrect && (
                            <span className="text-emerald-700">Kunci Benar: {pair.right}</span>
                          )}
                        </div>
                      ) : (
                        <select
                          value={selectedVal}
                          onChange={(e) => handleSetPairMatch(pair.left, e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        >
                          <option value="">-- Pilih Pasangan --</option>
                          {(currentQ.matching_pairs || []).map((p, rIdx) => (
                            <option key={rIdx} value={p.right}>
                              {p.right}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

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

        {/* ======================= TYPE 5: REORDER ======================= */}
        {currentType === "REORDER" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-500">
              Urutkan tahapan atau langkah-langkah berikut dari awal hingga akhir (1 ke {userOrder.length}):
            </p>

            <div className="space-y-2.5">
              {userOrder.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 font-bold text-sm flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-sm text-slate-800">{item}</span>
                  </div>

                  {!isAnswered && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveOrderItem(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-20 transition"
                      >
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => moveOrderItem(idx, "down")}
                        disabled={idx === userOrder.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-20 transition"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSubmitReorder}
                  className="px-6 py-3 bg-cyan-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-cyan-700 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Urutan Langkah</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================= TYPE 6: FILL IN THE BLANKS ======================= */}
        {currentType === "FILL_IN_THE_BLANKS" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-500">
              Isi bagian rumpang [___] dengan kata kunci yang tepat:
            </p>

            <div className="space-y-3">
              <input
                type="text"
                disabled={isAnswered}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Ketik kata kunci jawaban..."
                className="w-full p-4 rounded-2xl border border-slate-300 text-slate-900 font-semibold text-base focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />

              {!isAnswered ? (
                <div className="flex justify-end">
                  <button
                    disabled={!userText.trim()}
                    onClick={handleSubmitFillIn}
                    className="px-6 py-3 bg-teal-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-teal-700 disabled:opacity-40 transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Isian</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs font-semibold text-teal-900">
                  <span>Kata Kunci Kunci: </span>
                  <span className="font-bold">
                    {(currentQ.blanks_keywords || []).join(", ") || currentQ.options[currentQ.correct_answer_index]}
                  </span>
                </div>
              )}
            </div>
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
                  {(currentQ.label_targets || []).map((pin, lIdx) => {
                    const labelText = pin.label;
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
                  {(currentQ.categorize_items || [])
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
