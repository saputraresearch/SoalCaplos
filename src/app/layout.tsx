import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import Header from "@/components/Header";
import ErrorTelemetry from "@/components/ErrorTelemetry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caplos - Create, Analyze & Personalize Learning Questions",
  description: "Platform pembuat kuis & asesmen interaktif cerdas berbasis AI yang ramah anak. Ekstraksi otomatis dari lembar soal PDF lengkap dengan diagram gambar dan 11 tipe soal interaktif.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-slate-50/70 text-caplos-navy flex flex-col min-h-screen selection:bg-caplos-blue-100 selection:text-caplos-navy">
        <ErrorTelemetry />
        <Header />

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
          {children}
        </main>

        <footer className="border-t border-slate-200/80 bg-white py-5 text-xs text-caplos-navy-600">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Caplos Mascot"
                className="w-6 h-6 rounded-full object-cover shadow-xs border border-caplos-blue-200"
              />
              <span className="font-bold text-caplos-navy text-sm">Caplos</span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-caplos-navy-500 font-medium">Create, Analyze & Personalize Learning Questions</span>
            </div>
            <p className="font-medium text-slate-400">© {new Date().getFullYear()} Caplos. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
