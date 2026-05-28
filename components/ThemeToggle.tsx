"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="fixed top-6 right-6 z-50">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full w-12 h-12 bg-white/10 dark:bg-black/20 backdrop-blur-md border-white/20 dark:border-white/10 text-black dark:text-white hover:bg-white/30 dark:hover:bg-white/10 transition-all shadow-lg"
      >
        {theme === "dark" ? (
          <Moon className="h-[1.5rem] w-[1.5rem]" />
        ) : (
          <Sun className="h-[1.5rem] w-[1.5rem]" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  )
}
