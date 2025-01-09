import { cardExamples } from "@pages/api/plain/example-cards";
import { createHmac } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { userMetadata } from "@calcom/prisma/zod-utils";

const inputSchema = z.object({
  customer: z.object({
    email: z.string().email(),
    username: z.string().optional(),
    timeZone: z.string().optional(),
    emailVerified: z.boolean().optional(),
    identityProvider: z.string().optional(),
    twoFactorEnabled: z.boolean().optional(),
  }),
  cardKeys: z.array(z.string()),
});

async function handler(request: Request) {
  const headersList = headers();
  const requestBody = await request.json();

  // HMAC verification
  const incomingSignature = headersList.get("plain-request-signature");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const expectedSignature = createHmac("sha-256", process.env.PLAIN_HMAC_SECRET_KEY!)
    .update(JSON.stringify(requestBody))
    .digest("hex");

  if (incomingSignature !== expectedSignature) {
    return new Response("Forbidden", { status: 403 });
  }

  // Validate request body
  const { cardKeys, customer } = inputSchema.parse(requestBody);

  const user = await UserRepository.findByEmail({ email: customer.email });

  if (!user) {
    return NextResponse.json({
      cards: [
        {
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
                      text: customer.email || "Unknown",
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
                      badgeLabel: customer.emailVerified ? "Yes" : "No",
                      badgeColor: customer.emailVerified ? "GREEN" : "RED",
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
                      text: customer.username || "Unknown",
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
                      text: "Unknown",
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
                      text: customer.timeZone || "Unknown",
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
                      badgeLabel: customer.twoFactorEnabled ? "Yes" : "No",
                      badgeColor: customer.twoFactorEnabled ? "GREEN" : "RED",
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
                      text: customer.identityProvider || "Unknown",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
  }

  // Parse user metadata
  const parsedMetadata = userMetadata.parse(user.metadata);

  const cards = await Promise.all(
    cardExamples.map(async (cardFn) => {
      return cardFn(
        user.email,
        user.id.toString(),
        user.username || "Unknown",
        user.timeZone,
        user.emailVerified,
        user.twoFactorEnabled
      );
    })
  );

  const filteredCards = cards.filter((card) => {
    return cardKeys.length === 0 || cardKeys.includes(card.key);
  });

  return NextResponse.json({
    cards: filteredCards,
    user: {
      ...user,
      metadata: parsedMetadata,
    },
  });
}

export const POST = apiRouteMiddleware(handler);
