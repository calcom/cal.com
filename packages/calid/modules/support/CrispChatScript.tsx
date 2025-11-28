/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from "react";

import { useMediaQuery } from "../../hooks/useMediaQuery";
import useIsWebView from "./hooks/useIsWebView";

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
    openCrispChat: () => void;
  }
}

export default function CrispChatScript() {
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
      if (!document.getElementById("crisp-chat-script")) {
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = "3375d605-22a8-4347-8a1e-6e30ce39c15b";

        const script = document.createElement("script");
        script.id = "crisp-chat-script";
        script.src = "https://client.crisp.chat/l.js";
        script.async = true;

        script.onload = () => {
          if (window.$crisp) {
            window.$crisp.push(["do", "chat:hide"]);

            window.$crisp.push([
              "on",
              "chat:closed",
              () => {
                if (window.$crisp) {
                  window.$crisp.push(["do", "chat:hide"]);
                }
              },
            ]);
          }
        };

        const head = document.getElementsByTagName("head")[0];
        head.appendChild(script);
      } else {
        if (window.$crisp) {
          window.$crisp.push(["do", "chat:hide"]);

          window.$crisp.push([
            "on",
            "chat:closed",
            () => {
              if (window.$crisp) {
                window.$crisp.push(["do", "chat:hide"]);
              }
            },
          ]);
        }
      }

      window.openCrispChat = () => {
        if (window.$crisp) {
          window.$crisp.push(["do", "chat:show"]);
          window.$crisp.push(["do", "chat:open"]);
        }
      };
      return;
    }

    if (!document.getElementById("crisp-chat-script")) {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = "3375d605-22a8-4347-8a1e-6e30ce39c15b";

      const script = document.createElement("script");
      script.id = "crisp-chat-script";
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;

      const head = document.getElementsByTagName("head")[0];
      head.appendChild(script);

      window.openCrispChat = () => {
        if (window.$crisp) {
          window.$crisp.push(["do", "chat:open"]);
        }
      };
    }

    return () => {
      const script = document.getElementById("crisp-chat-script");
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isWebView, isMobile]);

  return <></>;
}
