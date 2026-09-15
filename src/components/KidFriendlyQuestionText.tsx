"use client";

import React from "react";
import { parseQuestionStimulus } from "@/lib/storyQuestionParser";
import { BookOpen, HelpCircle } from "lucide-react";

interface KidFriendlyQuestionTextProps {
  text: string;
  className?: string;
  highlightPromptClass?: string;
  // If provided, custom render for the question prompt part (e.g. for interactive blanks in FILL_IN_THE_BLANKS)
  renderPrompt?: (promptText: string) => React.ReactNode;
}

export default function KidFriendlyQuestionText({
  text,
  className = "",
  highlightPromptClass = "",
  renderPrompt,
}: KidFriendlyQuestionTextProps) {
  const stimulus = parseQuestionStimulus(text);

  // If detected as a reading story/passage + question prompt
  if (stimulus.isStory && stimulus.storyParagraphs.length > 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Cerita / Wacana Card (Child-Friendly Reading Layout) */}
        <div className="bg-amber-50/70 border-2 border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all">
          {/* Badge Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200/60">
            <span className="w-7 h-7 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-900">
              Bacaan Cerita / Wacana
            </span>
          </div>

          {/* Paragraphs with spacious line height and friendly font */}
          <div className="space-y-3 pl-1 sm:pl-2 border-l-3 border-amber-400/80">
            {stimulus.storyParagraphs.map((para, pIdx) => (
              <p
                key={pIdx}
                className="text-base sm:text-lg text-slate-800 leading-relaxed font-normal tracking-normal"
              >
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* Highlighted Question Prompt Box */}
        <div className={`flex items-start gap-3 p-4 bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl ${highlightPromptClass}`}>
          <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <HelpCircle className="w-5 h-5" />
          </span>
          <div className="space-y-1 flex-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 block">
              Pertanyaan:
            </span>
            {renderPrompt ? (
              renderPrompt(stimulus.questionPrompt)
            ) : (
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {stimulus.questionPrompt}
              </h2>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard question without long story passage
  return (
    <div className={className}>
      {renderPrompt ? (
        renderPrompt(stimulus.questionPrompt || text)
      ) : (
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-relaxed tracking-normal">
          {text}
        </h2>
      )}
    </div>
  );
}
