"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "./embed";
import {
  EMBED_IFRAME_STATE,
  embedStore,
  incrementView,
  resetPageData,
  setReloadInitiated,
} from "./embed-iframe/lib/embedStore";
import {
  isBookerReady,
  isBrowser,
  isLinkReady,
  isPrerendering,
  keepParentInformedAboutDimensionChanges,
  log,
  recordResponseIfQueued,
  runAsap,
} from "./embed-iframe/lib/utils";
import { sdkActionManager } from "./sdk-event";
import type {
  BookerLayouts,
  EmbedBookerState,
  EmbedNonStylesConfig,
  EmbedStyles,
  PrefillAndIframeAttrsConfig,
  SetStyles,
  SlotsQuery,
  setNonStylesConfig,
  UiConfig,
} from "./types";
import { mapOldToNewCssVars } from "./ui/cssVarsMap";
import { useCompatSearchParams } from "./useCompatSearchParams";

export { useBookerEmbedEvents, useSlotsViewOnSmallScreen } from "./embed-iframe/react-hooks";

// We don't import it from Booker/types because the types from this module are published to npm and we can't import packages that aren't published
type BookerState = "loading" | "selecting_date" | "selecting_time" | "booking";

// Prerendering is a hidden process and we shouldn't really track any events from it unless absolutely necessary
const eventsAllowedInPrerendering = [
  // so that Postmessage communication starts
  "__iframeReady",
  // so that iframe height is adjusted according to the content, and iframe is ready to be shown when needed
  "__dimensionChanged",
  // When this event is fired, the iframe is still in prerender state but is going to be moved out of prerender state
  "__connectInitiated",

  "linkPrerendered",

  // For other events, we should consider introducing prerender specific events and not reuse existing events
];

declare global {
  interface Window {
    CalEmbed: {
      __logQueue?: unknown[];
      embedStore: typeof embedStore;
      applyCssVars: (cssVarsPerTheme: UiConfig["cssVarsPerTheme"]) => void;
    };
    // Marks that Booker has moved to some non-"loading" state
    _embedBookerState?: EmbedBookerState;
  }
}

let isSafariBrowser = false;

if (isBrowser) {
  window.CalEmbed = window?.CalEmbed || {};
  window.CalEmbed.embedStore = embedStore;
  const ua = navigator.userAgent.toLowerCase();
  isSafariBrowser = ua.includes("safari") && !ua.includes("chrome");
  if (isSafariBrowser) {
    log("Safari Detected: Using setTimeout instead of rAF");
  }
}

const setEmbedStyles = (stylesConfig: EmbedStyles) => {
  embedStore.styles = stylesConfig;
  for (const [, setEmbedStyle] of Object.entries(embedStore.reactStylesStateSetters)) {
    setEmbedStyle((styles) => {
      return {
        ...styles,
        ...stylesConfig,
      };
    });
  }
};

const setEmbedNonStyles = (stylesConfig: EmbedNonStylesConfig) => {
  embedStore.nonStyles = stylesConfig;
  for (const [, setEmbedStyle] of Object.entries(embedStore.reactStylesStateSetters)) {
    setEmbedStyle((styles) => {
      return {
        ...styles,
        ...stylesConfig,
      };
    });
  }
};

const registerNewSetter = (
  registration:
    | {
        elementName: keyof EmbedStyles;
        setState: SetStyles;
        styles: true;
      }
    | {
        elementName: keyof EmbedNonStylesConfig;
        setState: setNonStylesConfig;
        styles: false;
      }
) => {
  if (registration.styles) {
    embedStore.reactStylesStateSetters[registration.elementName as keyof EmbedStyles] = registration.setState;
    registration.setState(embedStore.styles || {});
    return () => {
      delete embedStore.reactStylesStateSetters[registration.elementName];
    };
  } else {
    embedStore.reactNonStylesStateSetters[registration.elementName as keyof EmbedNonStylesConfig] =
      registration.setState;
    registration.setState(embedStore.nonStyles || {});

    return () => {
      delete embedStore.reactNonStylesStateSetters[registration.elementName];
    };
  }
};

function isValidNamespace(ns: string | null | undefined) {
  return typeof ns !== "undefined" && ns !== null;
}

/**
 * It handles any URL change done through Web history API as well
 * History API is currently being used by Booker/utils/query-param
 */
const useUrlChange = (callback: (newUrl: string) => void) => {
  const currentFullUrl = isBrowser ? new URL(document.URL) : null;
  const pathname = currentFullUrl?.pathname ?? "";
  const searchParams = currentFullUrl?.searchParams ?? null;
  const lastKnownUrl = useRef(`${pathname}?${searchParams}`);
  useEffect(() => {
    const newUrl = `${pathname}?${searchParams}`;
    if (lastKnownUrl.current !== newUrl) {
      lastKnownUrl.current = newUrl;
      callback(newUrl);
    }
  }, [pathname, searchParams, callback]);
};

export const useEmbedTheme = () => {
  const searchParams = useCompatSearchParams();
  const [theme, setTheme] = useState(
    embedStore.theme || (searchParams?.get("theme") as typeof embedStore.theme)
  );

  const onUrlChange = useCallback(() => {
    sdkActionManager?.fire("__routeChanged", {});
  }, []);
  useUrlChange(onUrlChange);

  embedStore.setTheme = setTheme;
  return theme;
};

export const useEmbedUiConfig = () => {
  const [uiConfig, setUiConfig] = useState(embedStore.uiConfig || {});
  embedStore.setUiConfig.push(setUiConfig);
  useEffect(() => {
    return () => {
      const foundAtIndex = embedStore.setUiConfig.findIndex((item) => item === setUiConfig);
      embedStore.setUiConfig.splice(foundAtIndex, 1);
    };
  });
  return uiConfig;
};

export const useEmbedStyles = (elementName: keyof EmbedStyles) => {
  const [, setStyles] = useState<EmbedStyles>({});

  useEffect(() => {
    return registerNewSetter({
      elementName,
      setState: setStyles,
      styles: true,
    });
  }, []);
  const styles = embedStore.styles || {};
  return styles[elementName] || {};
};

export const useEmbedNonStylesConfig = (elementName: keyof EmbedNonStylesConfig) => {
  const [, setNonStyles] = useState({} as EmbedNonStylesConfig);

  useEffect(() => {
    return registerNewSetter({
      elementName,
      setState: setNonStyles,
      styles: false,
    });
  }, []);

  const nonStyles = embedStore.nonStyles || {};
  return nonStyles[elementName] || {};
};

export const useIsBackgroundTransparent = () => {
  let isBackgroundTransparent = false;
  const bodyEmbedStyles = useEmbedStyles("body");

  if (bodyEmbedStyles.background === "transparent") {
    isBackgroundTransparent = true;
  }
  return isBackgroundTransparent;
};

export const useBrandColors = () => {
  const brandingColors = useEmbedNonStylesConfig("branding") as EmbedNonStylesConfig["branding"];
  return brandingColors || {};
};

function getNamespace() {
  if (isValidNamespace(embedStore.namespace)) {
    return embedStore.namespace;
  }
  if (isBrowser) {
    const namespace = window?.getEmbedNamespace?.() ?? null;
    embedStore.namespace = namespace;
    return namespace;
  }
}

function getEmbedType() {
  if (embedStore.embedType) {
    return embedStore.embedType;
  }
  if (isBrowser) {
    const url = new URL(document.URL);
    const embedType = (embedStore.embedType = url.searchParams.get("embedType"));
    return embedType;
  }
}

export const useIsEmbed = (embedSsr?: boolean) => {
  const [isEmbed, setIsEmbed] = useState(embedSsr);
  useEffect(() => {
    const namespace = getNamespace();
    const _isValidNamespace = isValidNamespace(namespace);
    if (parent !== window && !_isValidNamespace) {
      log(
        "Looks like you have iframed cal.com but not using Embed Snippet. Directly using an iframe isn't recommended."
      );
    }
    setIsEmbed(window?.isEmbed?.() || false);
  }, []);
  return isEmbed;
};

export const useEmbedType = () => {
  const [state, setState] = useState<string | null | undefined>(null);
  useEffect(() => {
    setState(getEmbedType());
  }, []);
  return state;
};

function makeBodyVisible() {
  if (typeof document === "undefined" || !document.body) {
    return;
  }
  if (document.body.style.visibility !== "visible") {
    document.body.style.visibility = "visible";
  }
  if (document.body.style.opacity !== "1") {
    document.body.style.opacity = "1";
  }
  runAsap(() => {
    makeBodyVisible();
  });
}

function showPageAsNonEmbed() {
  makeBodyVisible();
  resetTransparentBackground();
  function resetTransparentBackground() {
    if (document.body.style.background === "transparent") {
      document.body.style.background = "";
    }
  }
}

async function ensureRoutingFormResponseIdInUrl({
  newlyRecordedResponseId,
  toBeThereParams,
  toRemoveParams,
}: {
  newlyRecordedResponseId: number;
  toBeThereParams: Record<string, string | string[]>;
  toRemoveParams: string[];
}) {
  const { stopEnsuringQueryParamsInUrl } = embedStore.router.ensureQueryParamsInUrl({
    toBeThereParams: {
      ...toBeThereParams,
      "cal.routingFormResponseId": newlyRecordedResponseId.toString(),
    },
    toRemoveParams,
  });
  stopEnsuringQueryParamsInUrl();
}

async function waitForRenderStateToBeCompleted() {
  return new Promise<void>((resolve) => {
    (function tryToConnect() {
      if (embedStore.renderState !== "completed") {
        runAsap(tryToConnect);
        return;
      }
      resolve();
    })();
  });
}

export const methods = {
  ui: function style(uiConfig: UiConfig) {
    log("Method: ui called", uiConfig);
    const stylesConfig = uiConfig.styles;

    if (stylesConfig) {
      console.warn(
        "Cal.com Embed: `styles` prop is deprecated. Use `cssVarsPerTheme` instead to achieve the same effect. Here is a list of CSS variables that are supported. https://github.com/calcom/cal.com/blob/main/packages/config/tailwind-preset.js#L19"
      );
    }

    if (stylesConfig?.body?.background) {
      document.body.style.background = stylesConfig.body.background as string;
    }

    if (uiConfig.theme) {
      embedStore.theme = uiConfig.theme as UiConfig["theme"];
      if (embedStore.setTheme) {
        embedStore.setTheme(uiConfig.theme);
      }
    }

    const oldCssVarsPerTheme = embedStore.uiConfig?.cssVarsPerTheme;
    const newCssVarsPerTheme = uiConfig.cssVarsPerTheme;
    let mergedCssVarsPerTheme: UiConfig["cssVarsPerTheme"] | undefined;

    if (oldCssVarsPerTheme || newCssVarsPerTheme) {
      mergedCssVarsPerTheme = {} as Record<"light" | "dark", Record<string, string>>;
      const themeKeys = [
        ...(oldCssVarsPerTheme ? Object.keys(oldCssVarsPerTheme) : []),
        ...(newCssVarsPerTheme ? Object.keys(newCssVarsPerTheme) : []),
      ];
      const themes = Array.from(new Set(themeKeys)) as Array<"light" | "dark">;

      for (const theme of themes) {
        mergedCssVarsPerTheme[theme] = {
          ...oldCssVarsPerTheme?.[theme],
          ...newCssVarsPerTheme?.[theme],
        };
      }
    }

    uiConfig = {
      ...embedStore.uiConfig,
      ...uiConfig,
      ...(mergedCssVarsPerTheme ? { cssVarsPerTheme: mergedCssVarsPerTheme } : {}),
    };

    if (uiConfig.cssVarsPerTheme) {
      const mappedCssVarsPerTheme = mapOldToNewCssVars(uiConfig.cssVarsPerTheme);
      window.CalEmbed.applyCssVars(mappedCssVarsPerTheme);
    }

    if (uiConfig.colorScheme) {
      actOnColorScheme(uiConfig.colorScheme);
    }

    if (embedStore.setUiConfig) {
      runAllUiSetters(uiConfig);
    }

    setEmbedStyles(stylesConfig || {});
    setEmbedNonStyles(stylesConfig || {});
  },
  parentKnowsIframeReady: (_unused: unknown) => {
    log("Method: `parentKnowsIframeReady` called");
    runAsap(function tryInformingLinkReady() {
      if (!isLinkReady({ embedStore })) {
        runAsap(tryInformingLinkReady);
        return;
      }

      if (hasPageError()) {
        handlePageError(window.CalComPageStatus);
        return;
      }

      makeBodyVisible();
      log("renderState is 'completed'");
      embedStore.renderState = "completed";
      if (isPrerendering()) {
        sdkActionManager?.fire("linkPrerendered", {});
      } else {
        sdkActionManager?.fire("linkReady", {});
      }
    });
  },
  connect: async function connect({
    config,
    params,
  }: {
    config: PrefillAndIframeAttrsConfig;
    params: Record<string, string | string[]>;
  }) {
    sdkActionManager?.fire("__connectInitiated", {});
    log("Method: connect, requested with params", { config, params });
    const {
      iframeAttrs: _1,
      "cal.embed.noSlotsFetchOnConnect": noSlotsFetchOnConnect,
      ...queryParamsFromConfig
    } = config;
    embedStore.providedCorrectHeightToParent = false;

    if (noSlotsFetchOnConnect !== "true") {
      log("Method: connect, noSlotsFetchOnConnect is false. Requesting slots re-fetch");
      embedStore.connectVersion = embedStore.connectVersion + 1;
    }

    const connectVersion = embedStore.connectVersion;
    const toBeThereParams = {
      ...params,
      ...(queryParamsFromConfig as Record<string, string | string[]>),
      "cal.embed.connectVersion": connectVersion.toString(),
    };

    const toRemoveParams = ["preload", "prerender", "cal.skipSlotsFetch"];
    await waitForRenderStateToBeCompleted();

    log("Method: connect, renderState is completed. Connecting");
    await connectPreloadedEmbed({
      toBeThereParams,
      toRemoveParams,
    });

    const newlyRecordedResponseId = await recordResponseIfQueued(params);
    if (typeof newlyRecordedResponseId !== "number") {
      return;
    }
    await ensureRoutingFormResponseIdInUrl({
      newlyRecordedResponseId,
      toBeThereParams,
      toRemoveParams,
    });
  },
  __reloadInitiated: function __reloadInitiated(_unused: unknown) {
    log("Method: __reloadInitiated called");
    setReloadInitiated(true);
  },
};

export type InterfaceWithParent = {
  [key in keyof typeof methods]: (firstAndOnlyArg: Parameters<(typeof methods)[key]>[number]) => void;
};

export const interfaceWithParent: InterfaceWithParent = methods;

// FIX 1: Derive the parent origin for postMessage targetOrigin.
// window.location.ancestorOrigins[0] is the origin of the parent page that embedded this iframe.
// Fallback to "*" only if ancestorOrigins is unavailable (not supported in some Firefox versions)
const getParentOrigin = (): string => {
  if (typeof window !== "undefined" && window.location?.ancestorOrigins?.[0]) {
    return window.location.ancestorOrigins[0];
  }
  // Fallback: try to derive from document.referrer
  if (typeof document !== "undefined" && document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      // Invalid referrer URL
    }
  }
  return "*";
};

const messageParent = (data: CustomEvent["detail"]) => {
  parent.postMessage(
    {
      originator: "CAL",
      ...data,
    },
    // FIX 2: Use specific parent origin instead of "*"
    getParentOrigin()
  );
};

function main() {
  if (!isBrowser) {
    return;
  }
  log("Embed SDK loaded", { isEmbed: window?.isEmbed?.() || false });
  const url = new URL(document.URL);
  embedStore.theme = window?.getEmbedTheme?.();

  const autoScrollFromParam = url.searchParams.get("ui.autoscroll");
  const shouldDisableAutoScroll = autoScrollFromParam === "false";
  const useSlotsViewOnSmallScreenParam = url.searchParams.get("useSlotsViewOnSmallScreen");

  embedStore.uiConfig = {
    colorScheme: url.searchParams.get("ui.color-scheme"),
    layout: url.searchParams.get("layout") as BookerLayouts,
    disableAutoScroll: shouldDisableAutoScroll,
    useSlotsViewOnSmallScreen: (useSlotsViewOnSmallScreenParam ?? "false") === "true",
  };

  actOnColorScheme(embedStore.uiConfig.colorScheme);
  if (top === window) {
    showPageAsNonEmbed();
    log("Embed SDK Skipped as we are in top");
    return;
  }

  const willSlotsBeFetched = url.searchParams.get("cal.skipSlotsFetch") !== "true";
  log(`Slots will ${willSlotsBeFetched ? "" : "NOT "}be fetched`);

  // FIX 3: Cache the expected parent origin for message validation.
  // window.location.ancestorOrigins[0] is the origin of the parent page embedding this iframe.
  const expectedParentOrigin = typeof window !== "undefined" ? window.location?.ancestorOrigins?.[0] : null;

  window.addEventListener("message", (e) => {
    const data: Message = e.data;
    if (!data) {
      return;
    }

    // Validate that the message comes from the expected parent origin.
    // ancestorOrigins[0] is reliable for iframes and available in all modern browsers.
    if (expectedParentOrigin && e.origin !== expectedParentOrigin) {
      log(`Rejected message from origin "${e.origin}" (expected parent: "${expectedParentOrigin}")`);
      return;
    }

    const method: keyof typeof interfaceWithParent = data.method;
    if (data.originator === "CAL" && typeof method === "string") {
      interfaceWithParent[method]?.(data.arg as never);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target || !(e.target instanceof Node)) {
      return;
    }
    const mainElement =
      document.getElementsByClassName("main")[0] ||
      document.getElementsByTagName("main")[0] ||
      document.documentElement;
    if (e.target.contains(mainElement)) {
      sdkActionManager?.fire("__closeIframe", {});
    }
  });

  sdkActionManager?.on("linkReady", () => {
    if (isPrerendering()) {
      return;
    }
    resetPageData();
    incrementView();
  });

  sdkActionManager?.on("*", (e) => {
    if (isPrerendering() && !eventsAllowedInPrerendering.includes(e.detail.type)) {
      return;
    }
    const detail = e.detail;
    log(detail);
    messageParent(detail);
  });

  if (url.searchParams.get("preload") !== "true" && window?.isEmbed?.()) {
    initializeAndSetupEmbed();
  } else {
    log(`Preloaded scenario - Skipping initialization and setup as only assets need to be loaded`);
  }
}

function hasPageError() {
  const pageStatus = window.CalComPageStatus;
  return !!(pageStatus && pageStatus != "200");
}

function handlePageError(pageStatus: string) {
  sdkActionManager?.fire("linkFailed", {
    code: pageStatus,
    msg: "Problem loading the link",
    data: {
      url: document.URL,
    },
  });
}

function initializeAndSetupEmbed() {
  sdkActionManager?.fire("__iframeReady", {
    isPrerendering: isPrerendering(),
  });

  embedStore.renderState = "inProgress";

  if (embedStore.state !== EMBED_IFRAME_STATE.NOT_INITIALIZED) {
    log("Embed Iframe already initialized");
    return;
  }
  embedStore.state = EMBED_IFRAME_STATE.INITIALIZED;
  log("Initializing embed-iframe");
  const pageStatus = window.CalComPageStatus;

  if (hasPageError()) {
    handlePageError(pageStatus);
    return;
  } else {
    keepParentInformedAboutDimensionChanges({ embedStore });
  }
}

function runAllUiSetters(uiConfig: UiConfig) {
  embedStore.uiConfig = uiConfig;
  embedStore.setUiConfig.forEach((setUiConfig) => setUiConfig(uiConfig));
}

function actOnColorScheme(colorScheme: string | null | undefined) {
  if (!colorScheme) {
    return;
  }
  document.documentElement.style.colorScheme = colorScheme;
}

async function connectPreloadedEmbed({
  toBeThereParams,
  toRemoveParams,
}: {
  toBeThereParams: Record<string, string | string[]>;
  toRemoveParams: string[];
}) {
  const { hasChanged, stopEnsuringQueryParamsInUrl } = embedStore.router.ensureQueryParamsInUrl({
    toBeThereParams,
    toRemoveParams,
  });

  let waitForFrames = 0;

  if (isBookerReady() && hasChanged) {
    waitForFrames = 2;
  }

  await new Promise<void>((resolve) => {
    runAsap(function tryToFireLinkReady() {
      if (!isLinkReady({ embedStore }) || waitForFrames > 0) {
        waitForFrames--;
        runAsap(tryToFireLinkReady);
        return;
      }
      if (hasPageError()) {
        handlePageError(window.CalComPageStatus);
        resolve();
        return;
      }

      stopEnsuringQueryParamsInUrl();
      sdkActionManager?.fire("__connectCompleted", {});
      sdkActionManager?.fire("linkReady", {});
      resolve();
    });
  });

  return {
    stopEnsuringQueryParamsInUrl,
  };
}

export function getEmbedBookerState({
  bookerState,
  slotsQuery,
}: {
  bookerState: BookerState;
  slotsQuery: SlotsQuery;
}): EmbedBookerState {
  if (bookerState === "loading") {
    return "initializing";
  }

  if (slotsQuery.isLoading) {
    return "slotsLoading";
  }

  if (slotsQuery.isPending) {
    return "slotsDone";
  }

  if (slotsQuery.isSuccess) {
    return "slotsDone";
  }

  if (slotsQuery.isError) {
    return "slotsLoadingError";
  }

  return "slotsPending";
}

export function updateEmbedBookerState({
  bookerState,
  slotsQuery,
}: {
  bookerState: BookerState;
  slotsQuery: SlotsQuery;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const _window = window as Window & {
    _embedBookerState?: EmbedBookerState;
  };

  const embedBookerState = getEmbedBookerState({ bookerState, slotsQuery });
  _window._embedBookerState = embedBookerState;
}

main();
