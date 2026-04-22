"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "./Button";

export function ThemeToggle({ theme, onChange }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-10 w-10 flex items-center justify-center rounded-full overflow-hidden hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      onClick={() => onChange(theme === "dark" ? "light" : "dark")}
    >
      <div className="relative h-6 w-6 flex items-center justify-center">
        <Sun
          className={`absolute h-6 w-6 text-amber-500 transition-all duration-500 ${
            theme === "dark" ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          className={`absolute h-6 w-6 text-blue-400 transition-all duration-500 ${
            theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
          }`}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
