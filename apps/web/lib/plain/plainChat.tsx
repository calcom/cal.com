import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

// Add interface for Plain Chat configuration
interface PlainChatConfig {
  appId: string;
  customerDetails: {
    email: string;
    emailHash: string;
    fullName: string;
    shortName: string;
  };
  links: Array<{
    icon: string;
    text: string;
    url: string;
  }>;
  chatButtons: Array<{
    icon: string;
    text: string;
    type: string;
    form?: {
      fields: Array<{
        type: string;
        placeholder: string;
        options: Array<{
          icon: string;
          text: string;
          threadDetails: {
            severity: string;
          };
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
    bottom: string;
    right: string;
  };
}

export const usePlain = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === "/event-types" && searchParams?.has("plain")) {
      window.Plain?.open();
    }
  }, [pathname, searchParams]);

  const openPlain = () => {
    if (window.Plain) {
      window.Plain.open();
    }
  };

  return { openPlain };
};

const PlainChat = () => {
  const [config, setConfig] = useState<PlainChatConfig | null>(null);
  const { data: session } = useSession();
  const { openPlain } = usePlain();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const initConfig = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch("/api/plain-hash", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to generate hash");
        }

        const { hash, email, fullName, shortName } = await response.json();

        const plainChatConfig = {
          appId: "liveChatApp_01JFJJK1RF3XA2ZDAEHERJ0VZZ",
          customerDetails: {
            email,
            fullName: "John",
            shortName,
            emailHash: hash,
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
              icon: "chat",
              text: "Ask a question",
              type: "primary",
            },
            {
              icon: "bulb",
              text: "Send feedback",
              type: "default",
            },
            {
              icon: "error",
              text: "Report an issue",
              type: "default",
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
                          severity: "critical",
                        },
                      },
                      {
                        icon: "error",
                        text: "Major functionality degraded",
                        threadDetails: {
                          severity: "major",
                        },
                      },
                      {
                        icon: "bug",
                        text: "Minor annoyance",
                        threadDetails: {
                          severity: "minor",
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
            bottom: "20px",
            right: "20px",
          },
        };

        setConfig(plainChatConfig);
      } catch (error) {
        console.error("Failed to initialize Plain Chat:", error);
      }
    };

    initConfig();
  }, [session]);

  // Only initialize Plain once when the script loads
  const plainChatScript = `
    window.plainScriptLoaded = function() {
      if (window.Plain && ${config ? true : false}) {
        Plain.init(${config ? JSON.stringify(config) : null});
      }
    }
  `;

  useEffect(() => {
    // Check if we're on /event-types with ?plain parameter after config is loaded
    if (pathname === "/event-types" && searchParams?.has("openPlain") && config) {
      // Small delay to ensure Plain is fully initialized
      setTimeout(() => {
        openPlain();
      }, 100);
    }
  }, [pathname, searchParams, config]);

  if (!config) return null;

  return (
    <>
      <Script
        id="plain-chat"
        src="https://chat.cdn-plain.com/index.js"
        strategy="afterInteractive"
        onLoad={() => window.plainScriptLoaded()}
      />
      <Script
        id="plain-chat-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: plainChatScript }}
      />
    </>
  );
};

export default PlainChat;
