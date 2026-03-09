import type { KnownParams, EmbedConfig } from "../types/shared";

export function delay(fn: (...args: unknown[]) => void): ReturnType<typeof setTimeout> {
  return setTimeout(fn, 50);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBookerPage(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any)._embedBookerState;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBookerDone(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)._embedBookerState === "slotsDone";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMultiParams(
  entries: IterableIterator<[string, string]> | null
): Record<string, string | string[]> {
  if (!entries) return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return [...(entries as any)].reduce<Record<string, string | string[]>>((acc, [k, v]) => {
    if (Object.prototype.hasOwnProperty.call(acc, k)) {
      const cur = acc[k];
      acc[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else {
      acc[k] = v;
    }
    return acc;
  }, {});
}

export function paramInSearch({
  param,
  value,
  search,
}: {
  param: string;
  value: string | string[];
  search: URLSearchParams;
}): boolean {
  if (!search.has(param)) return false;
  const all = parseMultiParams(search.entries());
  const existing = all[param];
  const target = Array.isArray(value) ? value : [value];
  if (!Array.isArray(existing) && target.length === 1) return existing === target[0];
  if (Array.isArray(existing) && target.length === existing.length)
    return target.every((v) => existing.includes(v));
  return false;
}

const ERRORS: Record<string, (msg?: string) => string> = {
  "404": (msg) => `Error Code: 404. ${msg ?? "Cal Link seems to be wrong."}`,
  routerError: (msg) => `Error Code: routerError. ${msg ?? "Something went wrong."}`,
};

export function buildErrorMessage({
  errorCode,
  errorMessage,
}: {
  errorCode?: string;
  errorMessage?: string;
}): string {
  const builder = errorCode ? ERRORS[errorCode] : undefined;
  if (builder) return builder(errorMessage);
  return `Error Code: ${errorCode}. ${errorMessage ?? "Something went wrong."}`;
}

export function camelToHyphen(str: string): string {
  return (str.charAt(0).toLowerCase() + str.slice(1)).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  '"': "&quot;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};

export function escapeAttr(val: string): string {
  return val.replace(/[&"'<>]/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

export function dataAttrs(props: Record<string, string | null | undefined>): string {
  return Object.entries(props)
    .filter((pair): pair is [string, string] => !!pair[1])
    .map(([k, v]) => `data-${camelToHyphen(k)}="${escapeAttr(v)}"`)
    .join(" ");
}

const KNOWN: (keyof KnownParams)[] = [
  "flag.coep",
  "layout",
  "ui.color-scheme",
  "theme",
  "cal.embed.pageType",
];

function checkKnown(key: string): boolean {
  const ok = KNOWN.includes(key as keyof KnownParams);
  if (!ok) console.warn(`Not reading unknown config prop: ${key}`);
  return ok;
}

export function readConfig<K extends keyof KnownParams>(config: KnownParams, key: K): KnownParams[K] | null {
  return checkKnown(key) ? config[key] ?? null : null;
}

export function readQueryParam<K extends keyof KnownParams>(param: K): NonNullable<KnownParams[K]> | null {
  if (!checkKnown(param)) return null;
  const val = new URL(document.URL).searchParams.get(param);
  return typeof val === "string" ? (val as NonNullable<KnownParams[K]>) : null;
}

export function isRouterPath(path: string): boolean {
  return new URL(path, "http://x.example").pathname === "/router";
}

export async function resolveRoutingResult({
  headlessRouterPageUrl,
}: {
  headlessRouterPageUrl: string;
}): Promise<{ redirect: string } | { message: string } | { error: string }> {
  const parsed = new URL(headlessRouterPageUrl);
  const endpoint = `${parsed.origin}${parsed.pathname.replace(/^\/?router/, "/api/router")}`;
  const resp = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify(parseMultiParams(parsed.searchParams.entries())),
    headers: { "Content-Type": "application/json" },
  });
  const result = await resp.json();
  if (result.status === "success") {
    if (!result.data.redirect && !result.data.message) throw new Error("No redirect or message in response");
    return result.data as { redirect: string } | { message: string };
  }
  if (!result.data.message) throw new Error("No message in response");
  return { error: result.data.message };
}

export function bookingPathsMatch({ path1, path2 }: { path1: string; path2: string }): boolean {
  const normalize = (p: string) => p.replace(/^\/team\//, "/");
  return normalize(path1) === normalize(path2);
}

export function configToParams(config: EmbedConfig): URLSearchParams {
  const { iframeAttrs: _skip, ...rest } = config;
  return Object.entries(rest).reduce((sp, [k, v]) => {
    if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
    else if (typeof v === "string") sp.set(k, v);
    return sp;
  }, new URLSearchParams());
}

export function withPrerenderConfig({
  config,
  isRouterLink,
  fetchSlotsInBackground,
}: {
  config: EmbedConfig;
  isRouterLink: boolean;
  fetchSlotsInBackground: boolean;
}): EmbedConfig & { prerender: string } {
  const updated = { ...config };
  if (isRouterLink) updated["cal.queueFormResponse"] = "true";
  if (!fetchSlotsInBackground) updated["cal.skipSlotsFetch"] = "true";
  return { ...updated, prerender: "true" };
}
