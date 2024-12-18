import { cardExamples } from "@pages/api/plain/example-cards";
import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // HMAC verification
  const requestBody = JSON.stringify(req.body);
  const incomingSignature = req.headers["plain-request-signature"];
  const expectedSignature = crypto
    .createHmac("sha-256", process.env.PLAIN_HMAC_SECRET_KEY!)
    .update(requestBody)
    .digest("hex");

  if (incomingSignature !== expectedSignature) {
    return res.status(403).send("Forbidden");
  }

  res.setHeader("Cache-Control", "no-cache");

  // Validate request body
  const { cardKeys, customer } = inputSchema.parse(req.body);

  // Use UserRepository instead of direct prisma query
  const user = await UserRepository.findByEmail({ email: customer.email });

  if (!user) {
    return res.status(200).json({
      cards: [
        {
          key: "customer-card",
          timeToLiveSeconds: null,
          components: [
            {
              componentSpacer: { spacerSize: "M" },
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
              componentSpacer: { spacerSize: "M" },
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
                      badgeLabel:
                        customer.emailVerified === undefined
                          ? "Unknown"
                          : customer.emailVerified
                          ? "Yes"
                          : "No",
                      badgeColor:
                        customer.emailVerified === undefined
                          ? "YELLOW"
                          : customer.emailVerified
                          ? "GREEN"
                          : "RED",
                    },
                  },
                ],
              },
            },
            {
              componentSpacer: { spacerSize: "M" },
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
              componentSpacer: { spacerSize: "M" },
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
              componentSpacer: { spacerSize: "M" },
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
                        customer.twoFactorEnabled === undefined
                          ? "Unknown"
                          : customer.twoFactorEnabled
                          ? "Yes"
                          : "No",
                      badgeColor:
                        customer.twoFactorEnabled === undefined
                          ? "YELLOW"
                          : customer.twoFactorEnabled
                          ? "GREEN"
                          : "RED",
                    },
                  },
                ],
              },
            },
            {
              componentSpacer: { spacerSize: "M" },
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

  res.status(200).json({
    cards: filteredCards,
    user: {
      ...user,
      metadata: parsedMetadata,
    },
  });
}
