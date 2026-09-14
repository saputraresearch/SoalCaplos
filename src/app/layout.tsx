import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import Header from "@/components/Header";
import ErrorTelemetry from "@/components/ErrorTelemetry";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizCaplos - Interactive PDF OCR Quiz Platform",
  description: "Transform scanned PDF exam sheets into interactive Quizizz-style quizzes using Gemini Vision OCR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 flex flex-col min-h-screen">
        <ErrorTelemetry />
        <Header />

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="flex items-center gap-1">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <span>Interactive Quiz Platform powered by Supabase & Gemini Vision OCR</span>
            </p>
            <p>© {new Date().getFullYear()} QuizCaplos</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
