import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";

const customerCardDisplay = (
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

const Card = z.object({
  key: z.string(),
  timeToLiveSeconds: z.number().int().min(0).nullish().default(null),
  components: z.array(z.any()).nullable(),
});

type Card = z.infer<typeof Card>;

const _cardExamples: ((
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
) => Card)[] = [customerCardDisplay];

const _inputSchema = z.object({
  customer: z.object({
    name: z.string().optional(),
    email: z.string().email(),
    username: z.string().optional(),
    timeZone: timeZoneSchema.optional(),
    emailVerified: z.boolean().optional(),
    identityProvider: z.string().optional(),
    twoFactorEnabled: z.boolean().optional(),
    lastActiveAt: z.string().optional(),
    teamName: z.string().optional(),
    teamSlug: z.string().optional(),
    isOrganization: z.boolean().optional(),
    stripeCustomerId: z.string().optional(),
  }),
  cardKeys: z.array(z.string()),
});

async function handler(_request: NextRequest) {
  return NextResponse.json({ error: "Plain Chat is no longer supported" }, { status: 404 });
}

export const POST = defaultResponderForAppDir(handler);
