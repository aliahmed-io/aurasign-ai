import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-8 sm:p-20 pointer-events-none">
      <main className="flex flex-col items-center gap-8 text-center max-w-4xl z-10 pointer-events-auto">
        
        {/* Glassmorphic Hero Container */}
        <div className="p-12 sm:p-16 rounded-[40px] bg-[#FDFBF7]/95 dark:bg-zinc-900/90 backdrop-blur-2xl border border-[#4A3B2C]/10 dark:border-white/10 shadow-2xl flex flex-col items-center gap-6">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-[#4A3B2C]/10 dark:bg-white/10 text-[#4A3B2C]/80 dark:text-white/80 border border-[#4A3B2C]/10 dark:border-white/10 backdrop-blur-md mb-4">
            Introducing AuraSign
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-[#4A3B2C] dark:text-white leading-tight">
            Contract Intelligence
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4A373] to-[#8C6D4C] dark:from-white dark:to-white/50">
              Redefined.
            </span>
          </h1>
          
          <p className="max-w-2xl text-lg sm:text-xl text-[#4A3B2C]/70 dark:text-white/70 leading-relaxed font-light">
            AuraSign uses AI and spatial computing to deconstruct legal documents into an interactive 3D environment. Identify risks and track obligations organically.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
            <Link href="/workspace">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/90 hover:scale-105 transition-all text-lg font-medium">
                Enter Workspace
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full border-black/20 dark:border-white/20 bg-white/20 dark:bg-black/20 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/40 dark:hover:border-white/40 transition-all text-lg backdrop-blur-md font-medium">
                View Demo
              </Button>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
