import { useEffect, useState } from "react";

const KEY = "mcaw-theme";
const COLOR_KEY = "mcaw-color-theme";

export type ColorTheme = "slate" | "cyber" | "emerald" | "amethyst" | "crimson";

const COLOR_THEMES: ColorTheme[] = ["slate", "cyber", "emerald", "amethyst", "crimson"];

function applyTheme(theme: "light" | "dark", colorTheme: ColorTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.colorTheme = colorTheme;
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("slate");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as "light" | "dark" | null) ?? "light";
    const savedColor = localStorage.getItem(COLOR_KEY) as ColorTheme | null;
    const nextColor = savedColor && COLOR_THEMES.includes(savedColor) ? savedColor : "slate";
    setTheme(saved);
    setColorThemeState(nextColor);
    applyTheme(saved, nextColor);

    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ theme: "light" | "dark"; colorTheme: ColorTheme }>).detail;
      if (!detail) return;
      setTheme(detail.theme);
      setColorThemeState(detail.colorTheme);
    };
    window.addEventListener("mcaw-theme-change", sync);
    return () => window.removeEventListener("mcaw-theme-change", sync);
  }, []);

  const update = (nextTheme: "light" | "dark", nextColor: ColorTheme) => {
    setTheme(nextTheme);
    setColorThemeState(nextColor);
    localStorage.setItem(KEY, nextTheme);
    localStorage.setItem(COLOR_KEY, nextColor);
    applyTheme(nextTheme, nextColor);
    window.dispatchEvent(new CustomEvent("mcaw-theme-change", { detail: { theme: nextTheme, colorTheme: nextColor } }));
  };

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    update(next, colorTheme);
  };

  const setColorTheme = (next: ColorTheme) => update(theme, next);

  return { theme, colorTheme, toggle, setColorTheme };
}
