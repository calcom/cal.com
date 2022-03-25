import { useState, useLayoutEffect, useEffect } from "react";

import { sdkEventManager } from "@lib/sdk-event";

let setEmbedStyles;
export const useEmbedStyles = () => {
  const [styles, setStyles] = useState({});
  // FIXME: We are overriding setEmbedStyles with the last component that has it's useEffect hook called.
  // It for sure has bug but not able to reproduce it yet. Look into it later.
  // Ideally we should maintain the list of setStyles for all the components using this hook and update all those components or select few of them
  useEffect(() => {
    setEmbedStyles = setStyles;
  }, []);
  return styles;
};

const methods = {
  // TODO: Give typesafety for methods to parent embed.ts
  ui: function style(uiConfig) {
    const stylesConfig = uiConfig.styles;

    // In case where parent gives instructions before setEmbedStyles is set.
    if (!setEmbedStyles) {
      return requestAnimationFrame(() => {
        style(uiConfig);
      });
    }

    if (stylesConfig.body?.background) {
      document.body.style.background = stylesConfig.body.background;
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
    sdkEventManager?.fire("linkReady", {});
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
      sdkEventManager?.fire("dimension-changed", {
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
  sdkEventManager?.on("*", (e) => {
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
  sdkEventManager?.fire("iframeReady", {});
}
