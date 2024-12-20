/* eslint-disable import/no-anonymous-default-export */
import type { Card } from "@pages/api/plain";

export default (
  email: string,
  id: string,
  username: string,
  timeZone: string,
  emailVerified: Date | null,
  twoFactorEnabled: boolean | null
): Card => {
  return {
    key: "customer-card",
    timeToLiveSeconds: null,
    components: [
      {
        componentSpacer: {
          spacerSize: "M",
        },
      },
      {
        componentRow: {
          rowMainContent: [
            {
              componentText: {
                text: "Email",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: email || "Unknown",
              },
            },
          ],
        },
      },
      {
        componentSpacer: {
          spacerSize: "M",
        },
      },
      {
        componentRow: {
          rowMainContent: [
            {
              componentText: {
                text: "Email Verified?",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentBadge: {
                badgeLabel: emailVerified === null ? "Unknown" : emailVerified ? "Yes" : "No",
                badgeColor: emailVerified === null ? "YELLOW" : emailVerified ? "GREEN" : "RED",
              },
            },
          ],
        },
      },
      {
        componentSpacer: {
          spacerSize: "M",
        },
      },
      {
        componentRow: {
          rowMainContent: [
            {
              componentText: {
                text: "Username",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: username || "Unknown",
              },
            },
          ],
        },
      },
      {
        componentSpacer: {
          spacerSize: "M",
        },
      },
      {
        componentRow: {
          rowMainContent: [
            {
              componentText: {
                text: "User ID",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: id || "Unknown",
              },
            },
          ],
        },
      },
      {
        componentSpacer: {
          spacerSize: "M",
        },
      },
      {
        componentRow: {
          rowMainContent: [
            {
              componentText: {
                text: "Time Zone",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: timeZone || "Unknown",
              },
            },
          ],
        },
      },
      {
        componentSpacer: {
          spacerSize: "M",
        },
      },
      {
        componentRow: {
          rowMainContent: [
            {
              componentText: {
                text: "Two Factor Enabled?",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentBadge: {
                badgeLabel: twoFactorEnabled === null ? "Unknown" : twoFactorEnabled ? "Yes" : "No",
                badgeColor: twoFactorEnabled === null ? "YELLOW" : twoFactorEnabled ? "GREEN" : "RED",
              },
            },
          ],
        },
      },
    ],
  };
};
