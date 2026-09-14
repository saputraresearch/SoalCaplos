import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logServerError } from "@/lib/serverLogger";
import {
  findLocalQuizById,
  findLocalQuizBySlug,
  updateLocalQuiz,
  deleteLocalQuiz,
} from "@/lib/localStorageData";
import { ParsedQuestion } from "@/lib/types";

// GET /api/quizzes/[id] - Fetch single quiz with questions by ID or Slug
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  if (isSupabaseConfigured) {
    try {
      // Look up by ID or Slug
      const { data: quizData, error: quizError } = await supabaseAdmin
        .from("quizzes")
        .select("*")
        .or(`id.eq.${id},slug.eq.${id}`)
        .single();

      if (!quizError && quizData) {
        const { data: questionsData } = await supabaseAdmin
          .from("questions")
          .select("*")
          .eq("quiz_id", quizData.id)
          .order("order_index", { ascending: true });

        const local = findLocalQuizById(quizData.id) || findLocalQuizBySlug(quizData.slug);

        const mergedQuestions = (questionsData || []).map((sq, i) => {
          const lq = local?.questions?.find((l) => l.id === sq.id || l.order_index === sq.order_index) || local?.questions?.[i];
          return {
            ...sq,
            question_type: lq?.question_type || sq.question_type || "MULTIPLE_CHOICE",
            correct_answers: lq?.correct_answers,
            matching_pairs: lq?.matching_pairs,
            reorder_items: lq?.reorder_items,
            correct_order: lq?.correct_order,
            blanks_keywords: lq?.blanks_keywords,
            rubric: lq?.rubric,
            math_solution: lq?.math_solution,
            image_context: lq?.image_context,
            label_targets: lq?.label_targets,
            hotspot_zone: lq?.hotspot_zone,
            categories: lq?.categories,
            categorize_items: lq?.categorize_items,
          };
        });

        return NextResponse.json({
          quiz: { ...quizData, status: local?.quiz?.status || quizData.status || "published" },
          questions: mergedQuestions.length > 0 ? mergedQuestions : (local?.questions || []),
        });
      }
    } catch {}
  }

  // Fallback to local storage (by ID or Slug)
  const local = findLocalQuizById(id) || findLocalQuizBySlug(id);
  if (local) {
    return NextResponse.json({
      quiz: local.quiz,
      questions: local.questions,
    });
  }

  return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
}

// PUT /api/quizzes/[id] - Update existing quiz
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { title, questions, status } = body as {
      title: string;
      questions: ParsedQuestion[];
      status?: "draft" | "published";
    };

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "At least one question is required." }, { status: 400 });
    }

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

    let updatedInSupabase = false;

    if (isSupabaseConfigured) {
      try {
        const updatePayload: Record<string, unknown> = { title: title.trim() };
        if (status) {
          updatePayload.status = status;
        }

        const { error: updateQuizError } = await supabaseAdmin
          .from("quizzes")
          .update(updatePayload)
          .eq("id", id);

        if (!updateQuizError) {
          // Replace questions: delete old, insert new
          await supabaseAdmin.from("questions").delete().eq("quiz_id", id);

          const questionsToInsert = questions.map((q, idx) => ({
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

          await supabaseAdmin.from("questions").insert(questionsToInsert);
          updatedInSupabase = true;
        }
      } catch (err) {
        console.warn("Supabase update error:", err);
      }
    }

    // Always update locally as well
    const localResult = updateLocalQuiz(id, title, questions, status);

    return NextResponse.json({
      success: true,
      storageMode: updatedInSupabase ? "supabase" : "local",
      quiz: localResult?.quiz,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logServerError(`/api/quizzes/${params.id} PUT`, msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/quizzes/[id] - Delete quiz and cascade delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from("quizzes").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete quiz error:", err);
      }
    }

    // Delete locally
    const deleted = deleteLocalQuiz(id);

    return NextResponse.json({ success: true, deleted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logServerError(`/api/quizzes/${params.id} DELETE`, msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
