/* eslint-disable import/no-anonymous-default-export */
import type { Card } from "@pages/api/plain";

export default (
  email: string,
  id: string,
  username: string,
  timeZone: string,
  emailVerified: Date | null,
  twoFactorEnabled: boolean | null,
  lastActiveAt: Date | null,
  identityProvider: string | null
): Card => {
  return {
    key: "customer-cards",
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
                badgeLabel: twoFactorEnabled === null ? "No" : twoFactorEnabled ? "Yes" : "No",
                badgeColor: twoFactorEnabled === null ? "RED" : twoFactorEnabled ? "GREEN" : "RED",
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
                text: lastActiveAt ? getRelativeTime(lastActiveAt) : "Unknown",
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
    ],
  };
};

function getRelativeTime(lastActiveAt: Date | null): string {
  if (!lastActiveAt) return "Unknown";

  const now = new Date();
  const diffInMs = now.getTime() - lastActiveAt.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      if (diffInMinutes === 0) return "Just now";
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    }
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears === 1 ? "" : "s"} ago`;
}
