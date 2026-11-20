"use client";
import { Moon, Sun } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";
const REVEAL_MS = 900;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDarkNow = () => document.documentElement.classList.contains("dark");

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  } catch { }
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDarkNow, () => false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  async function toggle() {
    const next = !dark;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion || !buttonRef.current) {
      applyTheme(next);
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => applyTheme(next));
    await transition.ready;
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: REVEAL_MS, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  }

  return (
    <button ref={buttonRef} type="button" onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={dark}
      className="relative grid size-10 touch:size-11 place-items-center overflow-hidden rounded-full bg-ink text-paper shadow-md transition hover:bg-ink-soft">
      <Sun className={`absolute size-4.5 transition duration-500 ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} strokeWidth={1.9} />
      <Moon className={`absolute size-4.5 transition duration-500 ${dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`} strokeWidth={1.9} />
    </button>
  );
}
