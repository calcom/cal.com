import { useRouter } from "next/router";
import { useState, useEffect, CSSProperties } from "react";

import { sdkActionManager } from "./sdk-event";

export interface UiConfig {
  hideEventTypeDetails?: boolean;
  theme?: "dark" | "light" | "auto";
  styles?: EmbedStyles;
}
declare global {
  interface Window {
    CalEmbed: {
      __logQueue?: any[];
      embedStore: any;
    };
    CalComPageStatus: string;
    isEmbed: () => boolean;
    resetEmbedStatus: () => void;
    getEmbedNamespace: () => string | null;
    getEmbedTheme: () => "dark" | "light" | null;
  }
}

const embedStore = {
  // Store all embed styles here so that as and when new elements are mounted, styles can be applied to it.
  styles: {},
  namespace: null,
  embedType: undefined,
  // Store all React State setters here.
  reactStylesStateSetters: {},
  parentInformedAboutContentHeight: false,
  windowLoadEventFired: false,
} as {
  styles: UiConfig["styles"];
  namespace: string | null;
  embedType: undefined | null | string;
  reactStylesStateSetters: any;
  parentInformedAboutContentHeight: boolean;
  windowLoadEventFired: boolean;
  theme?: UiConfig["theme"];
  uiConfig?: Omit<UiConfig, "styles" | "theme">;
  setTheme?: (arg0: string) => void;
  setUiConfig?: (arg0: UiConfig) => void;
};

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

function runAsap(fn: (...arg: any) => void) {
  if (isSafariBrowser) {
    // https://adpiler.com/blog/the-full-solution-why-do-animations-run-slower-in-safari/
    return setTimeout(fn, 50);
  }
  return requestAnimationFrame(fn);
}

function log(...args: any[]) {
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
  align: "left";
  branding?: {
    brandColor?: string;
    lightColor?: string;
    lighterColor?: string;
    lightestColor?: string;
    highlightColor?: string;
    darkColor?: string;
    darkerColor?: string;
    medianColor?: string;
  };
}

const setEmbedStyles = (stylesConfig: UiConfig["styles"]) => {
  embedStore.styles = stylesConfig;
  for (const [, setEmbedStyle] of Object.entries(embedStore.reactStylesStateSetters)) {
    (setEmbedStyle as any)((styles: any) => {
      return {
        ...styles,
        ...stylesConfig,
      };
    });
  }
};

const registerNewSetter = (elementName: keyof EmbedStyles | keyof EmbedNonStylesConfig, setStyles: any) => {
  embedStore.reactStylesStateSetters[elementName] = setStyles;
  // It's possible that 'ui' instruction has already been processed and the registration happened due to some action by the user in iframe.
  // So, we should call the setter immediately with available embedStyles
  setStyles(embedStore.styles);
};

const removeFromEmbedStylesSetterMap = (elementName: keyof EmbedStyles | keyof EmbedNonStylesConfig) => {
  delete embedStore.reactStylesStateSetters[elementName];
};

function isValidNamespace(ns: string | null | undefined) {
  return typeof ns !== "undefined" && ns !== null;
}

export const useEmbedTheme = () => {
  const router = useRouter();
  const [theme, setTheme] = useState(embedStore.theme || (router.query.theme as string));
  useEffect(() => {
    router.events.on("routeChangeComplete", () => {
      sdkActionManager?.fire("__routeChanged", {});
    });
  }, [router.events]);
  embedStore.setTheme = setTheme;
  return theme === "auto" ? null : theme;
};

export const useEmbedUiConfig = () => {
  const [uiConfig, setUiConfig] = useState(embedStore.uiConfig || {});
  embedStore.setUiConfig = setUiConfig;
  return uiConfig;
};

// TODO: Make it usable as an attribute directly instead of styles value. It would allow us to go beyond styles e.g. for debugging we can add a special attribute indentifying the element on which UI config has been applied
export const useEmbedStyles = (elementName: keyof EmbedStyles) => {
  const [styles, setStyles] = useState({} as EmbedStyles);

  useEffect(() => {
    registerNewSetter(elementName, setStyles);
    // It's important to have an element's embed style be required in only one component. If due to any reason it is required in multiple components, we would override state setter.
    return () => {
      // Once the component is unmounted, we can remove that state setter.
      removeFromEmbedStylesSetterMap(elementName);
    };
  }, []);

  return styles[elementName] || {};
};

export const useEmbedNonStylesConfig = (elementName: keyof EmbedNonStylesConfig) => {
  const [styles, setStyles] = useState({} as EmbedNonStylesConfig);

  useEffect(() => {
    registerNewSetter(elementName, setStyles);
    // It's important to have an element's embed style be required in only one component. If due to any reason it is required in multiple components, we would override state setter.
    return () => {
      // Once the component is unmounted, we can remove that state setter.
      removeFromEmbedStylesSetterMap(elementName);
    };
  }, []);

  return styles[elementName] || {};
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

// If you add a method here, give type safety to parent manually by adding it to embed.ts. Look for "parentKnowsIframeReady" in it
export const methods = {
  ui: function style(uiConfig: UiConfig) {
    // TODO: Create automatic logger for all methods. Useful for debugging.
    log("Method: ui called", uiConfig);
    const stylesConfig = uiConfig.styles;

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
    if (embedStore.setUiConfig) {
      embedStore.setUiConfig(uiConfig);
    }

    setEmbedStyles(stylesConfig || {});
  },
  parentKnowsIframeReady: () => {
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

const messageParent = (data: any) => {
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
      (document.getElementsByClassName("main")[0] as HTMLElement) ||
      document.getElementsByTagName("main")[0] ||
      document.documentElement;
    const documentScrollHeight = document.documentElement.scrollHeight;
    const documentScrollWidth = document.documentElement.scrollWidth;

    const contentHeight = mainElement.offsetHeight;
    const contentWidth = mainElement.offsetWidth;

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
  const url = new URL(document.URL);
  embedStore.theme = (window?.getEmbedTheme?.() || "auto") as UiConfig["theme"];
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
      //console.log(detail.fullType, detail.type, detail.data);
      log(detail);
      messageParent(detail);
    });

    // This event should be fired whenever you want to let the content take automatic width which is available.
    // Because on cal-iframe we set explicty width to make it look inline and part of page, there is never space available for content to automatically expand
    // This is a HACK to quickly tell iframe to go full width and let iframe content adapt to that and set new width.
    sdkActionManager?.on("__refreshWidth", () => {
      // sdkActionManager?.fire("__dimensionChanged", {
      //   iframeWidth: 100,
      //   __unit: "%",
      // });
      // runAsap(() => {
      //   sdkActionManager?.fire("__dimensionChanged", {
      //     iframeWidth: 100,
      //     __unit: "%",
      //   });
      // });
    });

    window.addEventListener("message", (e) => {
      const data: Record<string, any> = e.data;
      if (!data) {
        return;
      }
      const method: keyof typeof methods = data.method;
      if (data.originator === "CAL" && typeof method === "string") {
        methods[method]?.(data.arg);
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target) {
        return;
      }
      const mainElement =
        (document.getElementsByClassName("main")[0] as HTMLElement) ||
        document.getElementsByTagName("main")[0] ||
        document.documentElement;
      if ((e.target as HTMLElement).contains(mainElement)) {
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
