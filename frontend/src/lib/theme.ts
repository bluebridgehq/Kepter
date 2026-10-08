import { load, save } from "./storage.ts";

export type Theme = "light" | "dark";

const KEY = "kepter:theme";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

/** The saved choice, or the device setting when nothing has been picked yet. */
export function currentTheme(): Theme {
  return load<Theme | null>(KEY, null) ?? (systemDark.matches ? "dark" : "light");
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0D1412" : "#FBF7F1");
}

export function setTheme(theme: Theme): void {
  save(KEY, theme);
  apply(theme);
}

export function initTheme(): void {
  apply(currentTheme());
  systemDark.addEventListener("change", () => {
    if (load<Theme | null>(KEY, null) === null) apply(currentTheme());
  });
}
