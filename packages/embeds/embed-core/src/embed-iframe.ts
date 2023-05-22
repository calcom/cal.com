import { useRouter } from "next/router";
import type { CSSProperties } from "react";
import { useState, useEffect } from "react";

import embedInit from "@calcom/embed-core/embed-iframe-init";

import type { Message } from "./embed";
import { sdkActionManager } from "./sdk-event";

type Theme = "dark" | "light";
export type EmbedThemeConfig = Theme | "auto";
export type UiConfig = {
  hideEventTypeDetails?: boolean;
  theme?: EmbedThemeConfig;
  styles?: EmbedStyles & EmbedNonStylesConfig;
  //TODO: Extract from tailwind the list of all custom variables and support them in auto-completion as well as runtime validation. Followup with listing all variables in Embed Snippet Generator UI.
  cssVarsPerTheme?: Record<Theme, Record<string, string>>;
};

type SetStyles = React.Dispatch<React.SetStateAction<EmbedStyles>>;
type setNonStylesConfig = React.Dispatch<React.SetStateAction<EmbedNonStylesConfig>>;

const embedStore = {
  // Store all embed styles here so that as and when new elements are mounted, styles can be applied to it.
  styles: {} as EmbedStyles | undefined,
  nonStyles: {} as EmbedNonStylesConfig | undefined,
  namespace: null as string | null,
  embedType: undefined as undefined | null | string,
  // Store all React State setters here.
  reactStylesStateSetters: {} as Record<keyof EmbedStyles, SetStyles>,
  reactNonStylesStateSetters: {} as Record<keyof EmbedNonStylesConfig, setNonStylesConfig>,
  parentInformedAboutContentHeight: false,
  windowLoadEventFired: false,
  setTheme: undefined as ((arg0: EmbedThemeConfig) => void) | undefined,
  theme: undefined as UiConfig["theme"],
  uiConfig: undefined as Omit<UiConfig, "styles" | "theme"> | undefined,
  setUiConfig: undefined as ((arg0: UiConfig) => void) | undefined,
};

declare global {
  interface Window {
    CalEmbed: {
      __logQueue?: unknown[];
      embedStore: typeof embedStore;
      applyCssVars: (cssVarsPerTheme: UiConfig["cssVarsPerTheme"]) => void;
    };
    CalComPageStatus: string;
    isEmbed?: () => boolean;
    resetEmbedStatus: () => void;
    getEmbedNamespace: () => string | null;
    getEmbedTheme: () => "dark" | "light" | null;
  }
}

let isSafariBrowser = false;
const isBrowser = typeof window !== "undefined";

if (isBrowser) {
  window.CalEmbed = window?.CalEmbed || {};
  window.CalEmbed.embedStore = embedStore;
  const ua = navigator.userAgent.toLowerCase();
  isSafariBrowser = ua.includes("safari") && !ua.includes("chrome");
  if (isSafariBrowser) {
    log("Safari Detected: Using setTimeout instead of rAF");
  }
}

function runAsap(fn: (...arg: unknown[]) => void) {
  if (isSafariBrowser) {
    // https://adpiler.com/blog/the-full-solution-why-do-animations-run-slower-in-safari/
    return setTimeout(fn, 50);
  }
  return requestAnimationFrame(fn);
}

function log(...args: unknown[]) {
  if (isBrowser) {
    const namespace = getNamespace();

    const searchParams = new URL(document.URL).searchParams;
    const logQueue = (window.CalEmbed.__logQueue = window.CalEmbed.__logQueue || []);
    args.push({
      ns: namespace,
      url: document.URL,
    });
    args.unshift("CAL:");
    logQueue.push(args);
    if (searchParams.get("debug")) {
      console.log(...args);
    }
  }
}

// Only allow certain styles to be modified so that when we make any changes to HTML, we know what all embed styles might be impacted.
// Keep this list to minimum, only adding those styles which are really needed.
interface EmbedStyles {
  body?: Pick<CSSProperties, "background">;
  eventTypeListItem?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  enabledDateButton?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  disabledDateButton?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  availabilityDatePicker?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
}
interface EmbedNonStylesConfig {
  /** Default would be center */
  align?: "left";
  branding?: {
    brandColor?: string;
  };
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
  // It's possible that 'ui' instruction has already been processed and the registration happened due to some action by the user in iframe.
  // So, we should call the setter immediately with available embedStyles
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

export const useEmbedTheme = () => {
  const router = useRouter();
  const [theme, setTheme] = useState(embedStore.theme || (router.query.theme as typeof embedStore.theme));
  useEffect(() => {
    router.events.on("routeChangeComplete", () => {
      sdkActionManager?.fire("__routeChanged", {});
    });
  }, [router.events]);
  embedStore.setTheme = setTheme;
  return theme;
};

export const useEmbedUiConfig = () => {
  const [uiConfig, setUiConfig] = useState(embedStore.uiConfig || {});
  embedStore.setUiConfig = setUiConfig;
  return uiConfig;
};

// TODO: Make it usable as an attribute directly instead of styles value. It would allow us to go beyond styles e.g. for debugging we can add a special attribute indentifying the element on which UI config has been applied
export const useEmbedStyles = (elementName: keyof EmbedStyles) => {
  const [, setStyles] = useState<EmbedStyles>({});

  useEffect(() => {
    return registerNewSetter({ elementName, setState: setStyles, styles: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const styles = embedStore.styles || {};
  // Always read the data from global embedStore so that even across components, the same data is used.
  return styles[elementName] || {};
};

export const useEmbedNonStylesConfig = (elementName: keyof EmbedNonStylesConfig) => {
  const [, setNonStyles] = useState({} as EmbedNonStylesConfig);

  useEffect(() => {
    return registerNewSetter({ elementName, setState: setNonStyles, styles: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always read the data from global embedStore so that even across components, the same data is used.
  const nonStyles = embedStore.nonStyles || {};
  return nonStyles[elementName] || {};
};

export const useIsBackgroundTransparent = () => {
  let isBackgroundTransparent = false;
  // TODO: Background should be read as ui.background and not ui.body.background
  const bodyEmbedStyles = useEmbedStyles("body");

  if (bodyEmbedStyles.background === "transparent") {
    isBackgroundTransparent = true;
  }
  return isBackgroundTransparent;
};

export const useBrandColors = () => {
  // TODO: Branding shouldn't be part of ui.styles. It should exist as ui.branding.
  const brandingColors = useEmbedNonStylesConfig("branding") as EmbedNonStylesConfig["branding"];
  return brandingColors || {};
};

function getNamespace() {
  if (isValidNamespace(embedStore.namespace)) {
    // Persist this so that even if query params changed, we know that it is an embed.
    return embedStore.namespace;
  }
  if (isBrowser) {
    const namespace = window?.getEmbedNamespace?.() || null;
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

function unhideBody() {
  document.body.style.visibility = "visible";
}

// It is a map of methods that can be called by parent using doInIframe({method: "methodName", arg: "argument"})
const methods = {
  ui: function style(uiConfig: UiConfig) {
    // TODO: Create automatic logger for all methods. Useful for debugging.
    log("Method: ui called", uiConfig);
    const stylesConfig = uiConfig.styles;

    if (stylesConfig) {
      console.warn(
        "Cal.com Embed: `styles` prop is deprecated. Use `cssVarsPerTheme` instead to achieve the same effect"
      );
    }

    // body can't be styled using React state hook as it is generated by _document.tsx which doesn't support hooks.
    if (stylesConfig?.body?.background) {
      document.body.style.background = stylesConfig.body.background as string;
    }

    if (uiConfig.theme) {
      embedStore.theme = uiConfig.theme as UiConfig["theme"];
      if (embedStore.setTheme) {
        embedStore.setTheme(uiConfig.theme);
      }
    }

    // Set the value here so that if setUiConfig state isn't available and later it's defined,it uses this value
    embedStore.uiConfig = uiConfig;

    if (uiConfig.cssVarsPerTheme) {
      window.CalEmbed.applyCssVars(uiConfig.cssVarsPerTheme);
    }

    if (embedStore.setUiConfig) {
      embedStore.setUiConfig(uiConfig);
    }

    setEmbedStyles(stylesConfig || {});
    setEmbedNonStyles(stylesConfig || {});
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parentKnowsIframeReady: (_unused: unknown) => {
    log("Method: `parentKnowsIframeReady` called");
    runAsap(function tryInformingLinkReady() {
      // TODO: Do it by attaching a listener for change in parentInformedAboutContentHeight
      if (!embedStore.parentInformedAboutContentHeight) {
        runAsap(tryInformingLinkReady);
        return;
      }
      // No UI change should happen in sight. Let the parent height adjust and in next cycle show it.
      unhideBody();
      sdkActionManager?.fire("linkReady", {});
    });
  },
};

export type InterfaceWithParent = {
  // Ensure that only one argument is read by the method
  [key in keyof typeof methods]: (firstAndOnlyArg: Parameters<(typeof methods)[key]>[number]) => void;
};

export const interfaceWithParent: InterfaceWithParent = methods;

const messageParent = (data: CustomEvent["detail"]) => {
  parent.postMessage(
    {
      originator: "CAL",
      ...data,
    },
    "*"
  );
};

function keepParentInformedAboutDimensionChanges() {
  let knownIframeHeight: number | null = null;
  let knownIframeWidth: number | null = null;
  let isFirstTime = true;
  let isWindowLoadComplete = false;
  runAsap(function informAboutScroll() {
    if (document.readyState !== "complete") {
      // Wait for window to load to correctly calculate the initial scroll height.
      runAsap(informAboutScroll);
      return;
    }
    if (!isWindowLoadComplete) {
      // On Safari, even though document.readyState is complete, still the page is not rendered and we can't compute documentElement.scrollHeight correctly
      // Postponing to just next cycle allow us to fix this.
      setTimeout(() => {
        isWindowLoadComplete = true;
        informAboutScroll();
      }, 100);
      return;
    }
    if (!embedStore.windowLoadEventFired) {
      sdkActionManager?.fire("__windowLoadComplete", {});
    }
    embedStore.windowLoadEventFired = true;
    // Use the dimensions of main element as in most places there is max-width restriction on it and we just want to show the main content.
    // It avoids the unwanted padding outside main tag.
    const mainElement =
      document.getElementsByClassName("main")[0] ||
      document.getElementsByTagName("main")[0] ||
      document.documentElement;
    const documentScrollHeight = document.documentElement.scrollHeight;
    const documentScrollWidth = document.documentElement.scrollWidth;

    if (!(mainElement instanceof HTMLElement)) {
      throw new Error("Main element should be an HTMLElement");
    }

    const mainElementStyles = getComputedStyle(mainElement);
    // Use, .height as that gives more accurate value in floating point. Also, do a ceil on the total sum so that whatever happens there is enough iframe size to avoid scroll.
    const contentHeight = Math.ceil(
      parseFloat(mainElementStyles.height) +
        parseFloat(mainElementStyles.marginTop) +
        parseFloat(mainElementStyles.marginBottom)
    );
    const contentWidth = Math.ceil(
      parseFloat(mainElementStyles.width) +
        parseFloat(mainElementStyles.marginLeft) +
        parseFloat(mainElementStyles.marginRight)
    );

    // During first render let iframe tell parent that how much is the expected height to avoid scroll.
    // Parent would set the same value as the height of iframe which would prevent scroll.
    // On subsequent renders, consider html height as the height of the iframe. If we don't do this, then if iframe get's bigger in height, it would never shrink
    const iframeHeight = isFirstTime ? documentScrollHeight : contentHeight;
    const iframeWidth = isFirstTime ? documentScrollWidth : contentWidth;
    embedStore.parentInformedAboutContentHeight = true;
    if (!iframeHeight || !iframeWidth) {
      runAsap(informAboutScroll);
      return;
    }
    if (knownIframeHeight !== iframeHeight || knownIframeWidth !== iframeWidth) {
      knownIframeHeight = iframeHeight;
      knownIframeWidth = iframeWidth;
      // FIXME: This event shouldn't be subscribable by the user. Only by the SDK.
      sdkActionManager?.fire("__dimensionChanged", {
        iframeHeight,
        iframeWidth,
        isFirstTime,
      });
    }
    isFirstTime = false;
    // Parent Counterpart would change the dimension of iframe and thus page's dimension would be impacted which is recursive.
    // It should stop ideally by reaching a hiddenHeight value of 0.
    // FIXME: If 0 can't be reached we need to just abandon our quest for perfect iframe and let scroll be there. Such case can be logged in the wild and fixed later on.
    runAsap(informAboutScroll);
  });
}

if (isBrowser) {
  log("Embed SDK loaded", { isEmbed: window?.isEmbed?.() || false });
  // Exposes certain global variables/fns that are used by the app to get interface with the embed.
  embedInit();
  const url = new URL(document.URL);
  embedStore.theme = window?.getEmbedTheme?.() as UiConfig["theme"];
  if (url.searchParams.get("prerender") !== "true" && window?.isEmbed?.()) {
    log("Initializing embed-iframe");
    // HACK
    const pageStatus = window.CalComPageStatus;
    // If embed link is opened in top, and not in iframe. Let the page be visible.
    if (top === window) {
      unhideBody();
    }

    sdkActionManager?.on("*", (e) => {
      const detail = e.detail;
      log(detail);
      messageParent(detail);
    });

    window.addEventListener("message", (e) => {
      const data: Message = e.data;
      if (!data) {
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

    if (!pageStatus || pageStatus == "200") {
      keepParentInformedAboutDimensionChanges();
      sdkActionManager?.fire("__iframeReady", {});
    } else
      sdkActionManager?.fire("linkFailed", {
        code: pageStatus,
        msg: "Problem loading the link",
        data: {
          url: document.URL,
        },
      });
  }
}
