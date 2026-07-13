import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TimeLog — Where did your time go?",
  description:
    "A premium daily time logging application with automated productivity insights, calendar analytics, and weekly/monthly summaries.",
  keywords: ["time tracker", "productivity", "daily log", "time log", "analytics"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} dark`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090b" />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground transition-colors duration-300">
        <AppProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
