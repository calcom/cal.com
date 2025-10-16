/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from "react";

import { useMediaQuery } from "../../hooks/useMediaQuery";
import useIsWebView from "./hooks/useIsWebView";

declare global {
  interface Window {
    chatwootSDK: any;
    chatwootSettings: any;
    openOneHashChat: () => void;
    $chatwoot: {
      toggle: (state?: "open" | "close") => void;
      toggleBubbleVisibility: (state: "show" | "hide") => void;
    };
  }
}

export default function OneHashChatScript() {
  const isWebView = useIsWebView();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const isAuthOrGettingStartedPages = () => {
    if (typeof window === "undefined") return false;
    const pathname = window.location.pathname;
    return (
      pathname.includes("/auth/") ||
      pathname.includes("/login") ||
      pathname.includes("/signup") ||
      pathname.includes("/getting-started")
    );
  };

  useEffect(() => {
    if (isWebView === null) return;
    if (isMobile && !isAuthOrGettingStartedPages()) {
      window.openOneHashChat = () => {
        if (!document.getElementById("onehash-chat-sdk")) {
          const script = document.createElement("script");
          script.id = "onehash-chat-sdk";
          script.src = "https://chat.onehash.ai/packs/js/sdk.js";
          script.async = true;

          script.onload = () => {
            window.chatwootSettings = {
              hideMessageBubble: true,
              position: "right",
              type: "standard",
              launcherTitle: "Chat with us",
            };

            if (window.chatwootSDK) {
              window.chatwootSDK.run({
                websiteToken: "wDbXNafmeJPxJPAimstLMpZQ",
                baseUrl: "https://chat.onehash.ai",
              });
              setTimeout(() => {
                if (window.$chatwoot) {
                  window.$chatwoot.toggle("open");
                }
              }, 1000);
            }
          };

          document.body.appendChild(script);
        } else {
          if (window.$chatwoot) {
            window.$chatwoot.toggle("open");
          }
        }
      };
      return;
    }

    const script = document.createElement("script");
    script.id = "onehash-chat-sdk";
    script.src = "https://chat.onehash.ai/packs/js/sdk.js";
    script.async = true;

    script.onload = () => {
      window.chatwootSettings = {
        hideMessageBubble: isWebView,
        position: "right",
        type: "standard",
        launcherTitle: "Chat with us",
      };

      if (window.chatwootSDK) {
        window.chatwootSDK.run({
          websiteToken: "wDbXNafmeJPxJPAimstLMpZQ",
          baseUrl: "https://chat.onehash.ai",
        });
      }

      window.openOneHashChat = () => {
        if (window.$chatwoot) {
          window.$chatwoot.toggle("open");
        }
      };
    };

    document.body.appendChild(script);

    return () => {
      if (document.getElementById("onehash-chat-sdk")) {
        document.body.removeChild(script);
      }
    };
  }, [isWebView, isMobile]);

  return <></>;
}
