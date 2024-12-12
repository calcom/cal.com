import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

type Customer = {
  id: string;
  email: string;
  externalId?: string;
};

type Thread = {
  id: string;
  externalId?: string;
};

type CardRequest = {
  cardKeys: string[];
  customer: Customer;
  thread: Thread;
};

type CardComponent = {
  componentText?: {
    text: string;
  };
  componentDivider?: {
    dividerSpacing?: "relaxed" | "default" | "compact";
  };
  componentHeader?: {
    text: string;
  };
};

type CardResponse = {
  cards: {
    key: string;
    timeToLiveSeconds: number;
    components: CardComponent[];
  }[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log("Request received:", {
      method: req.method,
      body: req.body,
    });

    const { customer } = req.body as CardRequest;

    console.log("Looking up email:", customer.email);

    console.log("Request from Plain:", {
      method: req.method,
      body: req.body,
      customer: req.body?.customer,
      email: req.body?.customer?.email,
    });

    // Find user by email with platform billing info
    const user = await prisma.user.findFirst({
      where: {
        email: customer.email,
      },
      include: {
        teams: {
          include: {
            team: {
              include: {
                platformBilling: true,
              },
            },
          },
        },
      },
    });

    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      return res.status(404).json({
        cards: [
          {
            key: "user-info",
            timeToLiveSeconds: 86400,
            components: [
              {
                componentText: {
                  text: "No user found with this email",
                },
              },
            ],
          },
        ],
      });
    }

    const firstTeam = user.teams[0]?.team;
    const teamPlan = firstTeam?.platformBilling?.plan || "No Plan";
    const subscriptionStatus = firstTeam?.platformBilling?.overdue ? "Overdue" : "Active";

    const cardData: CardResponse = {
      cards: [
        {
          key: "user-info",
          timeToLiveSeconds: 86400,
          components: [
            {
              componentHeader: {
                text: "User Information",
              },
            },
            {
              componentText: {
                text: `User ID: ${user.id}`,
              },
            },
            {
              componentText: {
                text: `Username: ${user.username || "N/A"}`,
              },
            },
            {
              componentText: {
                text: `Email: ${user.email}`,
              },
            },
            {
              componentDivider: {},
            },
            {
              componentHeader: {
                text: "Team & Plan Information",
              },
            },
            {
              componentText: {
                text: `Team Plan: ${teamPlan}`,
              },
            },
            {
              componentText: {
                text: `Subscription Status: ${subscriptionStatus}`,
              },
            },
            {
              componentText: {
                text: `Team Name: ${firstTeam?.name || "No Team"}`,
              },
            },
            {
              componentDivider: {},
            },
            {
              componentHeader: {
                text: "Security",
              },
            },
            {
              componentText: {
                text: `Identity Provider: ${user.identityProvider}`,
              },
            },
            {
              componentText: {
                text: `2FA Enabled: ${user.twoFactorEnabled ? "Yes" : "No"}`,
              },
            },
          ],
        },
      ],
    };

    res.status(200).json(cardData);
  } catch (error) {
    console.error("Detailed error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });

    res.status(500).json({
      cards: [
        {
          key: "error",
          timeToLiveSeconds: 86400,
          components: [
            {
              componentText: {
                text: `Debug error: ${error?.message}`, // More detailed error message
              },
            },
          ],
        },
      ],
    });
  }
}
