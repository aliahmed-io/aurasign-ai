import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DemoPage() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-8 sm:p-20 pointer-events-none">
      <main className="flex flex-col items-center justify-between h-full gap-8 text-center max-w-4xl z-10 pointer-events-auto">
        <div className="mt-auto mb-10 pb-20">
          <Link href="/">
            <Button size="lg" variant="outline" className="h-14 px-8 rounded-full border-black/20 dark:border-white/20 bg-white/40 dark:bg-black/40 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/20 hover:border-black/40 dark:hover:border-white/40 transition-all text-lg backdrop-blur-md font-medium shadow-lg">
              Return Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
