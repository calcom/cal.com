/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";

import useIsWebView from "./hooks/useIsWebView";

declare global {
  interface Window {
    chatwootSDK: any;
    chatwootSettings: any;
  }
}

export default function OneHashChatScript() {
  const isWebView = useIsWebView();

  const adjustChatWidgetPosition = (element: HTMLElement) => {
    const windowWidth = window.innerWidth;
    if (windowWidth <= 900) {
      element.style.bottom = "78px";
    }
  };

  useEffect(() => {
    if (isWebView === null) return;
    const script = document.createElement("script");
    script.id = "onehash-chat-sdk";
    script.src = "https://chat.onehash.ai/packs/js/sdk.js";
    script.async = true;

    script.onload = () => {
      window.chatwootSettings = {
        hideMessageBubble: isWebView,

        position: window.innerWidth <= 900 ? "left" : "right",
        type: "standard",
        launcherTitle: "Chat with us",
      };

      if (window.chatwootSDK) {
        window.chatwootSDK.run({
          websiteToken: "wDbXNafmeJPxJPAimstLMpZQ",
          baseUrl: "https://chat.onehash.ai",
        });
      }

      const handleScriptLoad = () => {
        const elements = document.querySelectorAll(".woot-widget-bubble");
        elements.forEach((element) => {
          adjustChatWidgetPosition(element as HTMLElement);
        });

        // Adjust position on window resize
        window.addEventListener("resize", () => {
          elements.forEach((element) => {
            adjustChatWidgetPosition(element as HTMLElement);
          });
        });
      };

      // Use MutationObserver to detect when `.woot-widget-bubble` is added
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length) {
            const elements = document.querySelectorAll(".woot-widget-bubble");
            if (elements.length > 0) {
              handleScriptLoad();
              observer.disconnect(); // Stop observing after the element is found
              break;
            }
          }
        }
      });

      // Start observing body for added nodes
      observer.observe(document.body, { childList: true, subtree: true });
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [isWebView]);

  return <></>;
}
