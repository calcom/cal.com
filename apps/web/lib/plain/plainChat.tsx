import Script from "next/script";
import { useEffect, useState } from "react";

// Add interface for Plain Chat configuration
interface PlainChatConfig {
  appId: string;
  customerDetails: {
    email: string;
    emailHash: string;
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

const PlainChat = () => {
  const [config, setConfig] = useState<PlainChatConfig | null>(null);

  useEffect(() => {
    const initConfig = async () => {
      const email = "nizar@cal.com";

      try {
        // Get hash from server endpoint
        const response = await fetch("/api/plain-hash", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate hash");
        }

        const { hash } = await response.json();

        const plainChatConfig = {
          appId: "liveChatApp_01JFGTZC4M5QH5GSXCTPJCA88F",
          customerDetails: {
            fullName: "John Doe",
            shortName: "John",
            chatAvatarUrl: "https://picsum.photos/32/32",
            email: email,
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
  }, []);

  const plainChatScript = `
    window.plainScriptLoaded = function() {
      ${config ? `Plain.init(${JSON.stringify(config)})` : ""}
    }
  `;

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
