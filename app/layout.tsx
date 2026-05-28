import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CanvasProvider } from "@/components/canvas/Canvas";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuraSign - AI Contract Analyzer",
  description: "Advanced B2B SaaS application for AI contract analysis.",
};

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StoreHydrator } from "@/components/workspace/StoreHydrator";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#FDFBF7] dark:bg-[#050505] text-[#4A3B2C] dark:text-[#F5F5F7] overflow-x-hidden selection:bg-[#D4A373] dark:selection:bg-[#0A84FF] selection:text-white transition-colors duration-500">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <StoreHydrator />
          <ThemeToggle />
          <CanvasProvider>
            {/* We can put global 3D background effects here in the future */}
          </CanvasProvider>
          
          {/* Main UI Layer */}
          <main className="relative z-10 flex-1 flex flex-col pointer-events-none">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
