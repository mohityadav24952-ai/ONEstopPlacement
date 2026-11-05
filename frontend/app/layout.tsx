import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NeonFx } from "@/components/shared/NeonFx";
import { themeBootScript } from "@/lib/theme";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { FeedbackProvider } from "@/components/ui/Feedback";
import "./globals.css";

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
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <NeonFx />
        <AuthProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
