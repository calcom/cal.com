/* eslint-disable import/no-anonymous-default-export */
import type { Card } from "@pages/api/plain";

import dayjs from "@calcom/dayjs";

export default (
  name: string,
  email: string,
  id: string,
  username: string,
  timeZone: string,
  emailVerified: Date | null,
  twoFactorEnabled: boolean | null,
  identityProvider: string | null,
  lastActiveAt: Date | null,
  teamName: string | null,
  teamSlug: string | null,
  isOrganization: boolean | null,
  stripeCustomerId: string | null
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
        componentText: {
          text: "Basic Information",
          textColor: "NORMAL",
          textSize: "L",
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
                text: "Name",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: name || "Unknown",
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
        componentDivider: {
          dividerSpacingSize: "M",
        },
      },
      // Account Settings Section Title
      {
        componentText: {
          text: "Account Settings",
          textColor: "NORMAL",
          textSize: "L",
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
                text: "Identity Provider",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: identityProvider || "Unknown",
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
                text: "Last Active At",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: lastActiveAt ? dayjs(lastActiveAt).fromNow() : "Unknown",
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
        componentDivider: {
          dividerSpacingSize: "M",
        },
      },
      // Team Information Section Title
      {
        componentText: {
          text: "Team Information",
          textColor: "NORMAL",
          textSize: "L",
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
                text: "Team Name",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: teamName || "Unknown",
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
                text: "Team Slug",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: teamSlug || "Unknown",
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
                text: "Is Organization",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentBadge: {
                badgeLabel: isOrganization ? "Yes" : "No",
                badgeColor: isOrganization ? "GREEN" : "RED",
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
        componentDivider: {
          dividerSpacingSize: "M",
        },
      },
      {
        componentText: {
          text: "Security & Billing",
          textColor: "NORMAL",
          textSize: "M",
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
                text: "Stripe Customer ID",
                textColor: "MUTED",
              },
            },
          ],
          rowAsideContent: [
            {
              componentText: {
                text: stripeCustomerId || "Unknown",
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
                badgeLabel: emailVerified === null ? "No" : emailVerified ? "Yes" : "No",
                badgeColor: emailVerified === null ? "RED" : emailVerified ? "GREEN" : "RED",
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
                badgeLabel: twoFactorEnabled === null ? "No" : twoFactorEnabled ? "Yes" : "No",
                badgeColor: twoFactorEnabled === null ? "RED" : twoFactorEnabled ? "GREEN" : "RED",
              },
            },
          ],
        },
      },
    ],
  };
};
