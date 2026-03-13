import { EventChannel } from "../bus/channel";
import type {
  UiOptions,
  StylesMap,
  NonStyleConfig,
  StyleSetter,
  NonStyleSetter,
  BookerEmbedState,
  SlotQueryStatus,
} from "../types/shared";
import { iframeState, StorePhase } from "./state-store";

declare global {
  interface Window {
    CalEmbed: {
      __logQueue?: unknown[];
      embedStore: typeof iframeState;
      applyCssVars: (perTheme: Record<string, Record<string, string>>) => void;
    };
  }
}

let activeBus: EventChannel | null = null;

export function getFrameBus(): EventChannel | null {
  return activeBus;
}

const inBrowser = typeof window !== "undefined";

if (inBrowser) {
  window.CalEmbed = window.CalEmbed || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.CalEmbed.embedStore = iframeState as any;
}

function hasSkeletonSupport(): boolean {
  return !!new URL(document.URL).searchParams.get("cal.embed.pageType");
}

export function checkFrameReady({ store }: { store: typeof iframeState }): boolean {
  if (!store.parentNotified) return false;
  if (isBookerPage()) return hasSkeletonSupport() ? isBookerComplete() : true;
  return true;
}

function pushStyles(map: StylesMap): void {
  iframeState.styleMap = map;
  Object.values(iframeState.styleSetters).forEach((fn) =>
    (fn as StyleSetter)((prev) => ({ ...prev, ...map }))
  );
}

function pushNonStyles(map: NonStyleConfig): void {
  iframeState.nonStyleMap = map;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.values(iframeState.styleSetters).forEach((fn) => (fn as any)((prev: any) => ({ ...prev, ...map })));
}

export function registerStyleSetter(
  opts:
    | { key: keyof StylesMap; setter: StyleSetter; isStyle: true }
    | { key: keyof NonStyleConfig; setter: NonStyleSetter; isStyle: false }
): () => void {
  if (opts.isStyle) {
    iframeState.styleSetters[opts.key as keyof StylesMap] = opts.setter;
    opts.setter(iframeState.styleMap || {});
    return () => {
      delete iframeState.styleSetters[opts.key as keyof StylesMap];
    };
  }
  iframeState.nonStyleSetters[opts.key as keyof NonStyleConfig] = opts.setter;
  opts.setter(iframeState.nonStyleMap || {});
  return () => {
    delete iframeState.nonStyleSetters[opts.key as keyof NonStyleConfig];
  };
}

export function resolveNs(): string | null | undefined {
  if (iframeState.ns !== undefined && iframeState.ns !== null) return iframeState.ns;
  if (inBrowser) {
    const fromGlobal = window.getEmbedNamespace?.();
    if (typeof fromGlobal === "string") {
      iframeState.ns = fromGlobal;
      return iframeState.ns;
    }
    const url = new URL(document.URL);
    const fromParam = url.searchParams.get("embed");
    if (typeof fromParam === "string") {
      iframeState.ns = fromParam;
      return iframeState.ns;
    }
    if (window.name.includes("cal-embed=")) {
      iframeState.ns = window.name.replace(/cal-embed=(.*)/, "$1").trim();
      return iframeState.ns;
    }
    if (url.pathname.endsWith("/embed")) {
      iframeState.ns = "";
      return iframeState.ns;
    }
    iframeState.ns = null;
    return iframeState.ns;
  }
}

export function resolveEmbedKind(): string | null | undefined {
  if (iframeState.embedKind) return iframeState.embedKind;
  if (inBrowser) {
    iframeState.embedKind = new URL(document.URL).searchParams.get("embedType");
    return iframeState.embedKind;
  }
}

function keepVisible(): void {
  if (document.body.style.visibility !== "visible") document.body.style.visibility = "visible";
  setTimeout(keepVisible, 50);
}

function standaloneMode(): void {
  keepVisible();
  if (document.body.style.background === "transparent") document.body.style.background = "";
}

async function saveFormResponse({
  newId,
  toAdd,
  toRemove,
}: {
  newId: number;
  toAdd: ParamSet;
  toRemove: string[];
}): Promise<void> {
  const { stop } = iframeState.paramManager.ensureParams({
    requiredParams: { ...toAdd, "cal.routingFormResponseId": newId.toString() },
    forbiddenParams: toRemove,
  });
  stop();
}

type ParamSet = Record<string, string | string[]>;

function waitForRender(): Promise<void> {
  return new Promise((resolve) => {
    (function poll() {
      if (iframeState.renderState !== "completed") {
        setTimeout(poll, 50);
        return;
      }
      resolve();
    })();
  });
}

function broadcastUi(cfg: UiOptions): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iframeState.uiState = cfg as any;
  iframeState.uiSetters.forEach((fn) => fn(cfg));
}

function applyColorScheme(scheme: string | null | undefined): void {
  if (scheme) document.documentElement.style.colorScheme = scheme;
}

async function activateWithParams({
  toAdd,
  toRemove,
}: {
  toAdd: ParamSet;
  toRemove: string[];
}): Promise<void> {
  const { changed, stop } = iframeState.paramManager.ensureParams({
    requiredParams: toAdd,
    forbiddenParams: toRemove,
  });
  let holdCycles = isBookerComplete() && changed ? 2 : 0;

  await new Promise<void>((resolve) => {
    (function waitReady() {
      if (!checkFrameReady({ store: iframeState }) || holdCycles > 0) {
        holdCycles--;
        setTimeout(waitReady, 50);
        return;
      }
      stop();
      activeBus?.publish("__connectCompleted", {});
      activeBus?.publish("linkReady", {});
      resolve();
    })();
  });
}

export const frameActions = {
  ui(cfg: UiOptions): void {
    const { styles } = cfg;
    if (styles?.body?.background) document.body.style.background = styles.body.background as string;
    if (cfg.theme) {
      iframeState.activeTheme = cfg.theme as UiOptions["theme"];
      iframeState.applyTheme?.(cfg.theme);
    }
    const merged = { ...iframeState.uiState, ...cfg };
    if (merged.cssVarsPerTheme) window.CalEmbed.applyCssVars(merged.cssVarsPerTheme);
    if (cfg.colorScheme) applyColorScheme(cfg.colorScheme);
    if (iframeState.uiSetters) broadcastUi(merged);
    pushStyles(styles || {});
    pushNonStyles(styles || {});
  },

  parentKnowsIframeReady(_: unknown): void {
    (function check() {
      if (!checkFrameReady({ store: iframeState })) {
        setTimeout(check, 50);
        return;
      }
      keepVisible();
      iframeState.renderState = "completed";
      activeBus?.publish("linkReady", {});
    })();
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect: async function ({ config, params }: { config: any; params: ParamSet }): Promise<void> {
    activeBus?.publish("__connectInitiated", {});
    const { iframeAttrs: _a, "cal.embed.noSlotsFetchOnConnect": noFetch, ...rest } = config;

    iframeState.parentNotified = false;
    if (noFetch !== "true") iframeState.connectVersion++;

    const version = iframeState.connectVersion;
    const toAdd = { ...params, ...rest, "cal.embed.connectVersion": version.toString() };
    const toRemove = ["preload", "prerender", "cal.skipSlotsFetch"];

    await waitForRender();
    await activateWithParams({ toAdd, toRemove });

    const responseId = await recordQueuedResponse(params);
    if (typeof responseId !== "number") return;
    await saveFormResponse({ newId: responseId, toAdd, toRemove });
  },
};

export async function recordQueuedResponse(params: ParamSet): Promise<number | null> {
  const url = new URL(document.URL);
  const queuedId = url.searchParams.get("cal.queuedFormResponseId");
  if (!queuedId) return null;
  if (queuedId === "00000000-0000-0000-0000-000000000000") return 0;

  const { form: _skip, ...payload } = params;
  const res = await fetch("/api/routing-forms/queued-response", {
    method: "POST",
    body: JSON.stringify({ queuedFormResponseId: queuedId, params: payload }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.formResponseId ?? null;
}

export function computeBookerEmbedState({
  bookerState,
  slotsQuery,
}: {
  bookerState: "loading" | "selecting_date" | "selecting_time" | "booking";
  slotsQuery: SlotQueryStatus;
}): BookerEmbedState {
  if (bookerState === "loading") return "initializing";
  if (slotsQuery.isLoading) return "slotsLoading";
  if (slotsQuery.isPending || slotsQuery.isSuccess) return "slotsDone";
  if (slotsQuery.isError) return "slotsLoadingError";
  return "slotsPending";
}

export function syncBookerState({
  bookerState,
  slotsQuery,
}: {
  bookerState: "loading" | "selecting_date" | "selecting_time" | "booking";
  slotsQuery: SlotQueryStatus;
}): void {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._embedBookerState = computeBookerEmbedState({ bookerState, slotsQuery });
}

function isBookerPage(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any)._embedBookerState;
}

function isBookerComplete(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)._embedBookerState === "slotsDone";
}

function trackDimensions(): void {
  let lastH: number | null = null;
  let lastW: number | null = null;
  let first = true;
  let loaded = false;

  (function measure() {
    if (document.readyState !== "complete") {
      setTimeout(measure, 50);
      return;
    }
    if (!loaded) {
      setTimeout(() => {
        loaded = true;
        measure();
      }, 100);
      return;
    }

    if (!iframeState.windowLoaded) activeBus?.publish("__windowLoadComplete", {});
    iframeState.windowLoaded = true;

    const main =
      document.getElementsByClassName("main")[0] ||
      document.getElementsByTagName("main")[0] ||
      document.documentElement;

    if (!(main instanceof HTMLElement)) throw new Error("Main element not found");

    const style = getComputedStyle(main);
    const h = Math.ceil(
      parseFloat(style.height) + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
    );
    const w = Math.ceil(
      parseFloat(style.width) + parseFloat(style.marginLeft) + parseFloat(style.marginRight)
    );
    const effectiveH = first ? document.documentElement.scrollHeight : h;
    const effectiveW = first ? document.documentElement.scrollWidth : w;

    if (!effectiveH || !effectiveW) {
      setTimeout(measure, 50);
      return;
    }

    if (lastH !== effectiveH || lastW !== effectiveW || !iframeState.parentNotified) {
      iframeState.parentNotified = true;
      lastH = effectiveH;
      lastW = effectiveW;
      activeBus?.publish("__dimensionChanged", {
        iframeHeight: effectiveH,
        iframeWidth: effectiveW,
        isFirstTime: first,
      });
    }
    first = false;
    setTimeout(measure, 50);
  })();
}

function isPrerenderMode(): boolean {
  return new URL(document.URL).searchParams.get("prerender") === "true";
}

const PRERENDER_ALLOWED = ["__iframeReady", "__dimensionChanged", "__connectInitiated"];

function beginEmbed(): void {
  activeBus?.publish("__iframeReady", { isPrerendering: isPrerenderMode() });
  iframeState.renderState = "inProgress";

  if (iframeState.phase !== StorePhase.PENDING) return;
  iframeState.phase = StorePhase.READY;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageStatus = (window as any).CalComPageStatus;
  if (!pageStatus || pageStatus === "200") {
    trackDimensions();
  } else {
    activeBus?.publish("linkFailed", {
      code: pageStatus,
      msg: "Problem loading the link",
      data: { url: document.URL },
    });
  }
}

export function initFrameBridge(): void {
  if (!inBrowser) return;

  const url = new URL(document.URL);
  iframeState.activeTheme = window.getEmbedTheme?.();
  iframeState.uiState = {
    colorScheme: url.searchParams.get("ui.color-scheme"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layout: url.searchParams.get("layout") as any,
  };
  applyColorScheme(iframeState.uiState.colorScheme);

  if (top === window) {
    standaloneMode();
    return;
  }

  window.addEventListener("message", (e) => {
    if (!e.data) return;
    const method = e.data.method as keyof typeof frameActions;
    if (e.data.originator === "CAL" && typeof method === "string") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (frameActions as any)[method]?.(e.data.arg);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target || !(e.target instanceof Node)) return;
    const main =
      document.getElementsByClassName("main")[0] ||
      document.getElementsByTagName("main")[0] ||
      document.documentElement;
    if ((e.target as Node).contains(main)) activeBus?.publish("__closeIframe", {});
  });

  activeBus?.listen("*", (e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventType = (e as any).detail.type;
    if (isPrerenderMode() && !PRERENDER_ALLOWED.includes(eventType)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parent.postMessage({ originator: "CAL", ...(e as any).detail }, "*");
  });

  const isEmbed = window.isEmbed?.() ?? resolveNs() !== null;
  if (url.searchParams.get("preload") !== "true" && isEmbed) {
    beginEmbed();
  }
}

export function setupFrameBus(ns: string | null): void {
  activeBus = new EventChannel(ns);
}
