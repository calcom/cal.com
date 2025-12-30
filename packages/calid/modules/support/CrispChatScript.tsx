/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { trpc } from "@calcom/trpc/react";

import { useMediaQuery } from "../../hooks/useMediaQuery";

declare global {
  interface Window {
    $crisp: any;
    CRISP_WEBSITE_ID: string;
    CRISP_TOKEN_ID?: string;
    openCrispChat?: () => void;
  }
}

const CRISP_WEBSITE_ID = "3375d605-22a8-4347-8a1e-6e30ce39c15b";

const isAuthOrGettingStartedPages = (pathname: string) => {
  return (
    pathname.includes("/auth/") ||
    pathname.includes("/login") ||
    pathname.includes("/signup") ||
    pathname.includes("/getting-started")
  );
};

export default function CrispChatScript() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  const previousTokenRef = useRef<string | undefined>();
  const hasLoadedRef = useRef(false);

  const { data: crispTokenData } = trpc.viewer.me.getCrispTokenId.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "loading") return;

    if (!hasLoadedRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).$crisp = [];
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

      const script = document.createElement("script");
      script.id = "crisp-chat-script";
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;

      script.onload = () => {
        window.$crisp.push([
          "on",
          "session:loaded",
          () => {
            if (isMobile) {
              window.$crisp.push(["do", "chat:hide"]);
              window.$crisp.push(["on", "chat:closed", () => window.$crisp.push(["do", "chat:hide"])]);
            } else {
              const shouldHide = isAuthOrGettingStartedPages(window.location.pathname);
              if (shouldHide) {
                window.$crisp.push(["do", "chat:hide"]);
              } else {
                window.$crisp.push(["do", "chat:show"]);
              }
            }
          },
        ]);
      };

      document.head.appendChild(script);
      hasLoadedRef.current = true;
    }

    const currentToken = isAuthenticated ? crispTokenData?.crispTokenId : undefined;
    const tokenChanged = previousTokenRef.current !== currentToken;

    if (tokenChanged) {
      window.CRISP_TOKEN_ID = currentToken;
      window.$crisp?.push(["do", "session:reset"]);
    }

    previousTokenRef.current = currentToken;

    window.openCrispChat = () => {
      if (isMobile) {
        window.$crisp?.push(["do", "chat:show"]);
      }
      window.$crisp?.push(["do", "chat:open"]);
    };
  }, [isMobile, isAuthenticated, status, crispTokenData]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.$crisp || !Array.isArray(window.$crisp)) return;

    if (isMobile) {
      window.$crisp.push(["do", "chat:hide"]);
    } else {
      const shouldHide = isAuthOrGettingStartedPages(pathname || "");
      if (shouldHide) {
        window.$crisp.push(["do", "chat:hide"]);
      } else {
        window.$crisp.push(["do", "chat:show"]);
      }
    }
  }, [pathname, isMobile]);
}
