import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ParsedQuestion, Quiz, Question, QuestionType } from "@/lib/types";
import { logServerError } from "@/lib/serverLogger";
import { saveLocalQuiz, getLocalQuizzes } from "@/lib/localStorageData";

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 30);
  const random = Math.random().toString(36).substring(2, 7);
  return `${base || "quiz"}-${random}`;
}

export async function GET() {
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  let allQuizzes: Quiz[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        allQuizzes = data;
      }
    } catch {}
  }

  // Combine with local quizzes
  const localList = getLocalQuizzes().map((item) => item.quiz);
  const existingIds = new Set(allQuizzes.map((q) => q.id));

  for (const l of localList) {
    if (!existingIds.has(l.id)) {
      allQuizzes.push(l);
    }
  }

  allQuizzes.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ quizzes: allQuizzes });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, questions, status } = body as {
      title: string;
      questions: ParsedQuestion[];
      status?: "draft" | "published";
    };

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Quiz title is required." }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "At least one question is required." }, { status: 400 });
    }

    const slug = generateSlug(title);
    const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const quizRecord: Quiz = {
      id: quizId,
      title: title.trim(),
      slug,
      created_at: nowIso,
      status: status || "published",
    };

    const formattedQuestions: Question[] = questions.map((q, idx) => {
      const isMulti = Array.isArray(q.correct_answers) && q.correct_answers.length > 1;
      const effectiveType: QuestionType = isMulti ? "MULTIPLE_SELECT" : (q.question_type || "MULTIPLE_CHOICE");
      return {
        id: `q_${Date.now()}_${idx}`,
        quiz_id: quizId,
        question_text: q.question_text || `Question ${idx + 1}`,
        question_type: effectiveType,
        image_url: q.image_url || null,
        image_source_type: q.image_source_type || (q.image_url ? "PASTE_UPLOAD" : "NONE"),
        alt_text: q.alt_text || null,
        options: q.options || [],
        option_items: q.option_items || [],
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
    };
  });

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

    let savedToSupabase = false;

    if (isSupabaseConfigured) {
      try {
        const { data: quizData, error: quizError } = await supabaseAdmin
          .from("quizzes")
          .insert({
            title: title.trim(),
            slug,
            status: status || "published",
          })
          .select("id, title, slug, created_at, status")
          .single();

        if (!quizError && quizData) {
          quizRecord.id = quizData.id;
          quizRecord.created_at = quizData.created_at;
          quizRecord.status = quizData.status || status || "published";

          const questionsToInsert = formattedQuestions.map((q, idx) => ({
            quiz_id: quizData.id,
            question_text: q.question_text || `Question ${idx + 1}`,
            question_type: q.question_type || "MULTIPLE_CHOICE",
            image_url: q.image_url || null,
            image_source_type: q.image_source_type || "NONE",
            alt_text: q.alt_text || null,
            options: q.options || [],
            option_items: q.option_items || [],
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

          await supabaseAdmin.from("questions").insert(questionsToInsert);
          savedToSupabase = true;
        } else {
          console.warn("Supabase save failed, falling back to local storage:", quizError?.message);
        }
      } catch (sbErr) {
        console.warn("Supabase network error, saving locally:", sbErr);
      }
    }

    // Always ensure saved locally as well for maximum reliability & instant preview
    saveLocalQuiz(quizRecord, formattedQuestions);

    return NextResponse.json({
      success: true,
      storageMode: savedToSupabase ? "supabase" : "local",
      quiz: quizRecord,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating quiz:", errorMessage);
    logServerError("/api/quizzes", errorMessage, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
