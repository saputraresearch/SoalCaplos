import { NextRequest, NextResponse } from "next/server";
import { convertQuestionType } from "@/lib/questionConverter";
import { QuestionType, ParsedQuestion } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, target_type } = body as {
      question: ParsedQuestion;
      target_type: QuestionType;
    };

    if (!question || !target_type) {
      return NextResponse.json(
        { error: "question and target_type are required" },
        { status: 400 }
      );
    }

    const result = convertQuestionType(question, target_type);

    return NextResponse.json({
      success: true,
      converted_question: result.convertedQuestion,
      report: result.report,
    });
  } catch (err: unknown) {
    console.error("Error converting question:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
