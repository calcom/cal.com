/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { cardExamples } from "@pages/api/plain/example-cards";
import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // HMAC verification
    const requestBody = JSON.stringify(req.body);
    const incomingSignature = req.headers["plain-request-signature"];
    const expectedSignature = crypto
      .createHmac("sha-256", process.env.HMAC_SECRET_KEY!)
      .update(requestBody)
      .digest("hex");

    if (incomingSignature !== expectedSignature) {
      return res.status(403).send("Forbidden");
    }

    // Disabled vercel's edge cache
    res.setHeader("Cache-Control", "no-cache");

    const { cardKeys, customer } = req.body;
    const { email, id, username, timeZone, emailVerified, plan, identityProvider, twoFactorEnabled } =
      customer;

    if (!email) {
      return res.status(400).json({ error: "Invalid customer data" });
    }

    // Fetch user details from the database using Prisma
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return hardcoded data with the attempted email if user is not found
      return res.status(200).json({
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
                        text: "Plan",
                        textColor: "MUTED",
                      },
                    },
                  ],
                  rowAsideContent: [
                    {
                      componentText: {
                        text: plan || "Unknown",
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
        return cardFn(email, id, username, timeZone, emailVerified, plan, identityProvider, twoFactorEnabled);
      })
    );

    const filteredCards = cards.filter((card) => {
      return cardKeys.length === 0 || cardKeys.includes(card.key);
    });

    res.status(200).json({
      cards: filteredCards,
      user, // Include user details in the response if needed
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
