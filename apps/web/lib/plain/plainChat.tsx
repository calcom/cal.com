"use client";

import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useState, useCallback, useMemo } from "react";

import { IS_PLAIN_CHAT_ENABLED } from "@calcom/lib/constants";

import PlainContactForm from "./PlainContactForm";

declare global {
  interface Window {
    Plain?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      init: (config: any) => void;
      open: () => void;
    };
    plainScriptLoaded?: () => void;
    __PLAIN_CONFIG__?: PlainChatConfig;
  }
}

interface PlainChatConfig {
  appId: string;
  customerDetails: {
    email: string;
    emailHash: string;
    fullName: string;
    shortName: string;
    chatAvatarUrl: string;
  };
  links: Array<{
    icon: string;
    text: string;
    url: string;
  }>;
  chatButtons: Array<{
    icon: string;
    text: string;
    threadDetails?: {
      labelTypeIds: Array<string>;
      tierIdentifier: {
        externalId: string;
      };
    };
    form?: {
      fields: Array<{
        type: string;
        placeholder: string;
        options: Array<{
          icon: string;
          text: string;
          threadDetails: {
            labelTypeIds: Array<string>;
            tierIdentifier: {
              externalId: string;
            };
          };
          onClick?: () => void;
        }>;
      }>;
    };
  }>;
  entryPoint: {
    type: string;
  };
  hideBranding: boolean;
  theme: string;
  style: {
    brandColor: string;
    launcherBackgroundColor: string;
    launcherIconColor: string;
  };
  position: {
    zIndex: string;
    bottom: string;
    right: string;
  };
}

const PlainChat = IS_PLAIN_CHAT_ENABLED
  ? ({ nonce }: { nonce: string | undefined }) => {
      const [config, setConfig] = useState<PlainChatConfig | null>(null);
      const [isSmallScreen, setIsSmallScreen] = useState(false);
      const { data: session } = useSession();
      const pathname = usePathname();
      const searchParams = useSearchParams();

      const shouldOpenPlain = pathname === "/event-types" && searchParams?.has("openPlain");
      const userEmail = session?.user?.email;
      const isPaidUser = session?.user.belongsToActiveTeam || !!session?.user.org;

      const isAppDomain = useMemo(() => {
        const restrictedPathsSet = new Set(
          (process.env.NEXT_PUBLIC_PLAIN_CHAT_EXCLUDED_PATHS?.split(",") || []).map((path) => path.trim())
        );

        const pathSegments = pathname?.split("/").filter(Boolean) || [];

        return (
          typeof window !== "undefined" &&
          window.location.origin === process.env.NEXT_PUBLIC_WEBAPP_URL &&
          !pathSegments.some((segment) => restrictedPathsSet.has(segment))
        );
      }, [pathname]);

      const checkScreenSize = useCallback(() => {
        if (typeof window === "undefined") return;

        const isSmall = window.innerWidth < 768;
        setIsSmallScreen(isSmall);

        if (isSmall && window.Plain) {
          const plainElement = document.querySelector("#plain-container");
          plainElement?.remove();
          window.Plain = undefined;
        } else if (!isSmall && window.Plain === undefined) {
          window.plainScriptLoaded?.();
        }
      }, []);

      const initConfig = useCallback(async () => {
        if (!userEmail) return;

        // Check if Plain Chat is enabled
        if (!IS_PLAIN_CHAT_ENABLED) {
          return;
        }

        try {
          const response = await fetch("/api/plain-hash", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate hash: ${errorText}`);
          }

          const data = await response.json();

          if (!data.hash || !data.email || !data.appId) {
            throw new Error("Missing required fields in API response");
          }

          const plainChatConfig: PlainChatConfig = {
            appId: data.appId,
            customerDetails: {
              email: data.email,
              shortName: data.shortName,
              fullName: data.fullName,
              emailHash: data.hash,
              chatAvatarUrl: data.chatAvatarUrl,
            },
            links: [
              {
                icon: "book",
                text: "Documentation",
                url: "https://cal.com/docs",
              },
              {
                icon: "chat",
                text: "Ask the community",
                url: "https://github.com/calcom/cal.com/discussions",
              },
            ],
            chatButtons: [
              {
                icon: "bulb",
                text: "Send feedback",
                threadDetails: {
                  labelTypeIds: ["lt_01JFJWP3KECF1YQES6XF212RFW"],
                  tierIdentifier: { externalId: data.userTier },
                },
              },
              {
                icon: "error",
                text: "Report an issue",
                form: {
                  fields: [
                    {
                      type: "dropdown",
                      placeholder: "Select severity...",
                      options: [
                        {
                          icon: "support",
                          text: "I'm unable to use the app",
                          threadDetails: {
                            labelTypeIds: ["lt_01JFJWNWAC464N8DZ6YE71YJRF"],
                            tierIdentifier: { externalId: data.userTier },
                          },
                        },
                        {
                          icon: "error",
                          text: "Major functionality degraded",
                          threadDetails: {
                            labelTypeIds: ["lt_01JFJWP3KECF1YQES6XF212RFW"],
                            tierIdentifier: { externalId: data.userTier },
                          },
                        },
                        {
                          icon: "bug",
                          text: "Minor annoyance",
                          threadDetails: {
                            labelTypeIds: ["lt_01JFJWPC8ADW0PK28JHMJR6NSS"],
                            tierIdentifier: { externalId: data.userTier },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
            entryPoint: {
              type: "chat",
            },
            hideBranding: true,
            theme: "auto",
            style: {
              brandColor: "#FFFFFF",
              launcherBackgroundColor: "#262626",
              launcherIconColor: "#FFFFFF",
            },
            position: {
              zIndex: "1",
              bottom: "20px",
              right: "20px",
            },
          };

          plainChatConfig.chatButtons.push({
            icon: "chat",
            text: "Ask a question",
            threadDetails: {
              labelTypeIds: ["lt_01JFJWNWAC464N8DZ6YE71YJRF"],
              tierIdentifier: { externalId: data.userTier },
            },
          });

          if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
            window.__PLAIN_CONFIG__ = plainChatConfig;
          }

          setConfig(plainChatConfig);

          if (shouldOpenPlain) {
            const timer = setTimeout(() => {
              if (window.Plain) {
                window.Plain.open();
              }
            }, 100);
            return () => clearTimeout(timer);
          }
        } catch (error) {
          console.error("Failed to initialize Plain Chat:", error);
        }
      }, [userEmail, shouldOpenPlain]);

      useEffect(() => {
        if (!isAppDomain) return;

        // Skip initialization if Plain Chat is not enabled
        if (!IS_PLAIN_CHAT_ENABLED) return;

        checkScreenSize();
        window.addEventListener("resize", checkScreenSize);
        initConfig();

        return () => window.removeEventListener("resize", checkScreenSize);
      }, [isAppDomain, checkScreenSize, initConfig, userEmail]);

      const plainChatScript = `
        window.plainScriptLoaded = function() {
          if (window.Plain && ${Boolean(config)}) {
            try {
              Plain.init(${config ? JSON.stringify(config) : null});
            } catch (error) {
              console.error("Failed to initialize Plain:", error);
            }
          }
        }
      `;

      if (!isAppDomain || isSmallScreen || typeof window === "undefined") return null;

      if (!isPaidUser) {
        return <PlainContactForm />;
      }

      if (!config) return null;

      return (
        <>
          <Script
            nonce={nonce}
            id="plain-chat"
            src="https://chat.cdn-plain.com/index.js"
            strategy="afterInteractive"
            onLoad={() => window.plainScriptLoaded?.()}
          />
          <Script
            nonce={nonce}
            id="plain-chat-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: plainChatScript }}
          />
        </>
      );
    }
  : () => null;

export default PlainChat;
