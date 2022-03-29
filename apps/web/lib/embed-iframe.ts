import { useState, useLayoutEffect, useEffect, CSSProperties } from "react";

import { sdkActionManager } from "@lib/sdk-event";

let setEmbedStyles;

// Only allow certain styles to be modified so that when we make any changes to HTML, we know what all embed styles might be impacted.
// Keep this list to minimum, only adding those styles which are really needed.
interface EmbedStyles {
  body?: Pick<CSSProperties, "background">;
  eventTypeListItem?: Pick<CSSProperties, "background">;
}

export interface UiConfig {
  theme: string;
  styles: EmbedStyles;
}

export const useEmbedStyles = () => {
  const [styles, setStyles] = useState({} as EmbedStyles);
  // FIXME: We are overriding setEmbedStyles with the last component that has it's useEffect hook called.
  // It for sure has bug but not able to reproduce it yet. Look into it later.
  // Ideally we should maintain the list of setStyles for all the components using this hook and update all those components or select few of them
  useEffect(() => {
    setEmbedStyles = setStyles;
  }, []);
  return styles;
};

// If you add a method here, give type safety to parent manually by adding it to embed.ts. Look for "parentKnowsIframeReady" in it
export const methods = {
  ui: function style(uiConfig: UiConfig) {
    const stylesConfig = uiConfig.styles;

    // In case where parent gives instructions before setEmbedStyles is set.
    if (!setEmbedStyles) {
      return requestAnimationFrame(() => {
        style(uiConfig);
      });
    }

    if (stylesConfig.body?.background) {
      document.body.style.background = stylesConfig.body.background as string;
    }

    setEmbedStyles((styles) => {
      return {
        ...styles,
        ...stylesConfig,
      };
    });
  },
  parentKnowsIframeReady: () => {
    document.body.style.display = "block";
    sdkActionManager?.fire("linkReady", {});
  },
};

const messageParent = (data) => {
  parent.postMessage(
    {
      originator: "CAL",
      ...data,
    },
    "*"
  );
};

function keepParentInformedAboutDimensionChanges() {
  let knownHiddenHeight: Number | null = null;
  let numDimensionChanges = 0;
  requestAnimationFrame(function informAboutScroll() {
    // Because of scroll="no", this much is hidden from the user.
    const hiddenHeight = document.documentElement.scrollHeight - window.innerHeight;
    // TODO: Handle width as well.
    if (knownHiddenHeight !== hiddenHeight) {
      knownHiddenHeight = hiddenHeight;
      numDimensionChanges++;
      // FIXME: This event shouldn't be subscribable by the user. Only by the SDK.
      sdkActionManager?.fire("dimension-changed", {
        hiddenHeight,
      });
    }
    // Parent Counterpart would change the dimension of iframe and thus page's dimension would be impacted which is recursive.
    // It should stop ideally by reaching a hiddenHeight value of 0.
    // FIXME: If 0 can't be reached we need to just abandon our quest for perfect iframe and let scroll be there. Such case can be logged in the wild and fixed later on.
    if (numDimensionChanges > 50) {
      console.warn("Too many dimension changes detected.");
      return;
    }
    requestAnimationFrame(informAboutScroll);
  });
}

if (typeof window !== "undefined" && !location.search.includes("prerender=true")) {
  sdkActionManager?.on("*", (e) => {
    const detail = e.detail;
    //console.log(detail.fullType, detail.type, detail.data);
    messageParent(detail);
  });

  window.addEventListener("message", (e) => {
    const data = e.data;
    if (data.originator === "CAL") {
      methods[data.method]?.(data.arg);
    }
  });

  keepParentInformedAboutDimensionChanges();
  sdkActionManager?.fire("iframeReady", {});
}
