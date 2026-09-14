import fs from "fs";
import path from "path";
import { Quiz, Question, Submission, ParsedQuestion } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const QUIZZES_FILE = path.join(DATA_DIR, "local_quizzes.json");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "local_submissions.json");

export interface LocalQuizRecord {
  quiz: Quiz;
  questions: Question[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getLocalQuizzes(): LocalQuizRecord[] {
  ensureDataDir();
  if (!fs.existsSync(QUIZZES_FILE)) return [];
  try {
    const raw = fs.readFileSync(QUIZZES_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalQuiz(quiz: Quiz, questions: Question[]) {
  ensureDataDir();
  const all = getLocalQuizzes();
  all.unshift({ quiz, questions });
  fs.writeFileSync(QUIZZES_FILE, JSON.stringify(all, null, 2), "utf8");
}

export function updateLocalQuiz(
  id: string,
  title: string,
  questions: ParsedQuestion[],
  status?: "draft" | "published"
): LocalQuizRecord | null {
  ensureDataDir();
  const all = getLocalQuizzes();
  const index = all.findIndex((item) => item.quiz.id === id);
  if (index === -1) return null;

  all[index].quiz.title = title.trim();
  if (status) {
    all[index].quiz.status = status;
  }
  all[index].questions = questions.map((q, idx) => ({
    id: (q as Question).id || `q_${Date.now()}_${idx}`,
    quiz_id: id,
    question_text: q.question_text || `Question ${idx + 1}`,
    question_type: q.question_type || "MULTIPLE_CHOICE",
    image_url: q.image_url || null,
    options: q.options || [],
    correct_answer_index: q.correct_answer_index ?? 0,
    correct_answers: q.correct_answers || [q.correct_answer_index ?? 0],
    matching_pairs: q.matching_pairs || [],
    reorder_items: q.reorder_items || [],
    correct_order: q.correct_order || [],
    blanks_keywords: q.blanks_keywords || [],
    rubric: q.rubric || [],
    math_solution: q.math_solution || null,
    image_context: q.image_context || null,
    label_targets: q.label_targets || [],
    hotspot_zone: q.hotspot_zone || null,
    categories: q.categories || [],
    categorize_items: q.categorize_items || [],
    explanation: q.explanation || null,
    order_index: idx,
  }));

  fs.writeFileSync(QUIZZES_FILE, JSON.stringify(all, null, 2), "utf8");
  return all[index];
}

export function deleteLocalQuiz(id: string): boolean {
  ensureDataDir();
  const all = getLocalQuizzes();
  const filtered = all.filter((item) => item.quiz.id !== id);
  if (filtered.length === all.length) return false;

  fs.writeFileSync(QUIZZES_FILE, JSON.stringify(filtered, null, 2), "utf8");

  // Also cascade delete submissions for this quiz
  const allSubs = getLocalSubmissions();
  const filteredSubs = allSubs.filter((s) => s.quiz_id !== id);
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(filteredSubs, null, 2), "utf8");

  return true;
}

export function findLocalQuizBySlug(slug: string): LocalQuizRecord | null {
  const all = getLocalQuizzes();
  return all.find((item) => item.quiz.slug === slug) || null;
}

export function findLocalQuizById(id: string): LocalQuizRecord | null {
  const all = getLocalQuizzes();
  return all.find((item) => item.quiz.id === id) || null;
}

export function getLocalSubmissions(quizId?: string): Submission[] {
  ensureDataDir();
  if (!fs.existsSync(SUBMISSIONS_FILE)) return [];
  try {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, "utf8");
    const all: Submission[] = JSON.parse(raw);
    if (quizId) {
      return all.filter((s) => s.quiz_id === quizId);
    }
    return all;
  } catch {
    return [];
  }
}

export function saveLocalSubmission(submission: Submission) {
  ensureDataDir();
  const all = getLocalSubmissions();
  all.unshift(submission);
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(all, null, 2), "utf8");
}

export function deleteLocalSubmission(id: string): boolean {
  ensureDataDir();
  const all = getLocalSubmissions();
  const filtered = all.filter((s) => s.id !== id);
  if (filtered.length === all.length) return false;

  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(filtered, null, 2), "utf8");
  return true;
}
