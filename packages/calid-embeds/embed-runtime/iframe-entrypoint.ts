import type { ThemeOption } from "./src/types/shared";

function detectEmbedNamespace(): string | null {
  const url = new URL(document.URL);
  const fromParam = url.searchParams.get("embed");
  if (typeof fromParam === "string") return fromParam;
  if (window.name.includes("cal-embed=")) return window.name.replace(/cal-embed=(.*)/, "$1").trim();
  if (url.pathname.endsWith("/embed")) return "";
  return null;
}

function buildCssVarStylesheet(cssVarsPerTheme: Record<string, Record<string, string>>): string {
  return Object.entries(cssVarsPerTheme)
    .flatMap(([theme, vars]) => [
      `.${theme} {`,
      ...Object.entries(vars).map(([k, v]) => `--${k}: ${v} !important;`),
      `}`,
    ])
    .join("\n");
}

function applyEmbedCssVars(cssVarsPerTheme: Record<string, Record<string, string>>): void {
  const sheet = buildCssVarStylesheet(cssVarsPerTheme);
  const existing = document.head.querySelector<HTMLStyleElement>("#embed-css-vars");
  if (existing) {
    console.warn("Existing embed CSS Vars are being reset");
    existing.innerText = sheet;
    return;
  }
  const el = document.createElement("style");
  el.id = "embed-css-vars";
  el.innerText = sheet;
  document.head.appendChild(el);
}

export default function embedIframeInit(): void {
  if (typeof window === "undefined" || window.isEmbed) return;

  const ns = detectEmbedNamespace();

  window.isEmbed = () => typeof ns === "string";
  window.getEmbedNamespace = () => ns;
  window.getEmbedTheme = (): ThemeOption | null =>
    window.CalEmbed.embedStore.activeTheme ??
    (new URL(document.URL).searchParams.get("theme") as ThemeOption | null);

  window.CalEmbed = window.CalEmbed || {};
  window.CalEmbed.applyCssVars = applyEmbedCssVars;
}
