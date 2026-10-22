import { useEffect, useState } from "react";

const KEY = "mcaw-theme";
const COLOR_KEY = "mcaw-color-theme";

export type ColorTheme = "slate" | "cyber" | "emerald" | "amethyst" | "crimson";
export type ThemeMode = "light" | "dark" | "system";

const COLOR_THEMES: ColorTheme[] = ["slate", "cyber", "emerald", "amethyst", "crimson"];

const systemPrefersDark = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolveMode = (mode: ThemeMode): "light" | "dark" =>
  mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;

function applyTheme(theme: "light" | "dark", colorTheme: ColorTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.colorTheme = colorTheme;
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("slate");

  useEffect(() => {
    const savedMode = (localStorage.getItem(KEY) as ThemeMode | null) ?? "light";
    const savedColor = localStorage.getItem(COLOR_KEY) as ColorTheme | null;
    const nextColor = savedColor && COLOR_THEMES.includes(savedColor) ? savedColor : "slate";
    const resolved = resolveMode(savedMode);
    setModeState(savedMode);
    setTheme(resolved);
    setColorThemeState(nextColor);
    applyTheme(resolved, nextColor);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if ((localStorage.getItem(KEY) as ThemeMode | null) === "system") {
        const next = systemPrefersDark() ? "dark" : "light";
        setTheme(next);
        applyTheme(next, (localStorage.getItem(COLOR_KEY) as ColorTheme | null) ?? nextColor);
      }
    };
    media.addEventListener("change", onSystem);

    const sync = (event: Event) => {
      const detail = (
        event as CustomEvent<{ mode: ThemeMode; theme: "light" | "dark"; colorTheme: ColorTheme }>
      ).detail;
      if (!detail) return;
      setModeState(detail.mode);
      setTheme(detail.theme);
      setColorThemeState(detail.colorTheme);
    };
    window.addEventListener("mcaw-theme-change", sync);
    return () => {
      media.removeEventListener("change", onSystem);
      window.removeEventListener("mcaw-theme-change", sync);
    };
  }, []);

  const update = (nextMode: ThemeMode, nextColor: ColorTheme) => {
    const resolved = resolveMode(nextMode);
    setModeState(nextMode);
    setTheme(resolved);
    setColorThemeState(nextColor);
    localStorage.setItem(KEY, nextMode);
    localStorage.setItem(COLOR_KEY, nextColor);
    applyTheme(resolved, nextColor);
    window.dispatchEvent(
      new CustomEvent("mcaw-theme-change", {
        detail: { mode: nextMode, theme: resolved, colorTheme: nextColor },
      }),
    );
  };

  const toggle = () => update(theme === "dark" ? "light" : "dark", colorTheme);
  const setMode = (next: ThemeMode) => update(next, colorTheme);
  const setColorTheme = (next: ColorTheme) => update(mode, next);

  return { mode, theme, colorTheme, toggle, setMode, setColorTheme };
}
