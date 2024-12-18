import { cardExamples } from "@pages/api/plain/example-cards";
import { createHmac } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";
import { UserRepository } from "@calcom/lib/server/repository/user";

const inputSchema = z.object({
  customer: z.object({
    email: z.string().email(),
    id: z.string(),
    username: z.string(),
    timeZone: z.string(),
    emailVerified: z.date(),
    identityProvider: z.string(),
    twoFactorEnabled: z.boolean(),
  }),
  cardKeys: z.array(z.string()),
});

async function handler(request: Request) {
  const headersList = headers();
  // HMAC verification
  const requestBody = await request.json();
  const incomingSignature = headersList.get("plain-request-signature");
  const expectedSignature = createHmac("sha-256", process.env.PLAIN_HMAC_SECRET_KEY!)
    .update(JSON.stringify(requestBody))
    .digest("hex");

  if (incomingSignature !== expectedSignature) {
    return new Response("Forbidden", { status: 403 });
  }

  const {
    customer: { email, id, username, timeZone, emailVerified, identityProvider, twoFactorEnabled },
    cardKeys,
  } = inputSchema.parse(requestBody);

  const user = UserRepository.findByEmail({ email });

  if (!user) {
    // Return hardcoded data with the attempted email if user is not found
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
                      badgeLabel: emailVerified === undefined ? "Unknown" : emailVerified ? "Yes" : "No",
                      badgeColor: emailVerified === undefined ? "YELLOW" : emailVerified ? "GREEN" : "RED",
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
                      badgeLabel:
                        twoFactorEnabled === undefined ? "Unknown" : twoFactorEnabled ? "Yes" : "No",
                      badgeColor:
                        twoFactorEnabled === undefined ? "YELLOW" : twoFactorEnabled ? "GREEN" : "RED",
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
        },
      ],
    });
  }

  // Fetch the card data using the cardExamples function
  const cards = await Promise.all(
    cardExamples.map(async (cardFn) => {
      return cardFn(email, id, username, timeZone, emailVerified, identityProvider, twoFactorEnabled);
    })
  );

  const filteredCards = cards.filter((card) => {
    return cardKeys.length === 0 || cardKeys.includes(card.key);
  });

  return NextResponse.json({
    cards: filteredCards,
    user, // Include user details in the response if needed
  });
}

export const POST = apiRouteMiddleware(handler);
