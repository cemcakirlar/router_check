import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ThemeMode } from "../types";

export type { ThemeMode };

const THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export function normalizeThemeMode(value: unknown): ThemeMode {
  return isThemeMode(value) ? value : "system";
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

async function syncWindowTheme(mode: ThemeMode): Promise<void> {
  try {
    const theme = mode === "system" ? null : mode;
    await getCurrentWindow().setTheme(theme);
  } catch {
    // Web / non-Tauri previews ignore window theme APIs.
  }
}

let mediaQuery: MediaQueryList | null = null;
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null;

function clearSystemListener(): void {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener("change", mediaListener);
  }
  mediaQuery = null;
  mediaListener = null;
}

function paintResolvedTheme(resolved: "light" | "dark"): void {
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

/** Apply theme preference to the document and native window chrome. */
export function applyThemeMode(mode: ThemeMode): void {
  const preference = normalizeThemeMode(mode);
  document.documentElement.setAttribute("data-theme-preference", preference);
  paintResolvedTheme(resolveTheme(preference));
  void syncWindowTheme(preference);

  clearSystemListener();
  if (preference !== "system") return;

  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaListener = () => {
    paintResolvedTheme(resolveTheme("system"));
  };
  mediaQuery.addEventListener("change", mediaListener);
}
