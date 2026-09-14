import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logServerError } from "@/lib/serverLogger";
import {
  saveLocalSubmission,
  getLocalSubmissions,
  deleteLocalSubmission,
} from "@/lib/localStorageData";
import { Submission } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get("quiz_id") || undefined;

  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  let subs: Submission[] = [];

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin.from("submissions").select("*");
      if (quizId) query = query.eq("quiz_id", quizId);
      const { data, error } = await query.order("completed_at", { ascending: false });
      if (!error && data) {
        subs = data;
      }
    } catch {}
  }

  // Combine with local submissions
  const localSubs = getLocalSubmissions(quizId);
  const existingIds = new Set(subs.map((s) => s.id));
  for (const ls of localSubs) {
    if (!existingIds.has(ls.id)) {
      subs.push(ls);
    }
  }

  subs.sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  return NextResponse.json({ submissions: subs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quiz_id, student_name, score, total_questions, answers } = body;

    if (!quiz_id || !student_name || score === undefined || !total_questions) {
      return NextResponse.json({ error: "Missing required submission fields." }, { status: 400 });
    }

    const submissionRecord: Submission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      quiz_id,
      student_name: student_name.trim(),
      score,
      total_questions,
      answers: answers || [],
      completed_at: new Date().toISOString(),
    };

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from("submissions")
          .insert({
            quiz_id,
            student_name: student_name.trim(),
            score,
            total_questions,
            answers: answers || [],
          })
          .select()
          .single();

        if (!error && data) {
          submissionRecord.id = data.id;
          submissionRecord.completed_at = data.completed_at;
        }
      } catch (sbErr) {
        console.warn("Supabase insert failed, saving locally:", sbErr);
      }
    }

    // Save locally
    saveLocalSubmission(submissionRecord);

    return NextResponse.json({ success: true, submission: submissionRecord });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Submit quiz API error:", msg);
    logServerError("/api/submit-quiz", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing submission ID parameter." }, { status: 400 });
    }

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from("submissions").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete submission error:", err);
      }
    }

    deleteLocalSubmission(id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logServerError("/api/submit-quiz DELETE", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
