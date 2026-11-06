import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { EffectsLayer } from "@/components/effects/EffectsLayer";
import { themeBootScript } from "@/lib/theme";
import { effectsBootScript } from "@/lib/effects";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { FeedbackProvider } from "@/components/ui/Feedback";
import "./globals.css";
import "./effects.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ONEstopPlacement",
  description: "AI career copilot for placement preparation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={inter.variable}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript + effectsBootScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <EffectsLayer />
        <AuthProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
