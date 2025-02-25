import { cardExamples } from "@pages/api/plain/example-cards";
import { createHmac } from "crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { userMetadata } from "@calcom/prisma/zod-utils";

const inputSchema = z.object({
  customer: z.object({
    name: z.string().optional(),
    email: z.string().email(),
    username: z.string().optional(),
    timeZone: z.string().optional(),
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

async function handler(request: NextRequest) {
  const headersList = headers();
  const requestBody = await request.json();

  // HMAC verification
  const incomingSignature = headersList.get("plain-request-signature");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const expectedSignature = createHmac("sha-256", process.env.PLAIN_HMAC_SECRET_KEY!)
    .update(JSON.stringify(requestBody))
    .digest("hex");

  if (incomingSignature !== expectedSignature) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
              componentText: {
                textSize: "L",
                textColor: "MUTED",
                text: "User does not exist!",
              },
            },
          ],
        },
      ],
    });
  }

  // Fetch team details including userId and team name
  const teamMemberships = await UserRepository.findTeamsByUserId({ userId: user.id });
  const firstTeam = teamMemberships.teams[0] ?? null;

  // Parse user metadata
  const parsedMetadata = userMetadata.parse(user.metadata);

  const cards = await Promise.all(
    cardExamples.map(async (cardFn) => {
      return cardFn(
        user.name || "Unknown",
        user.email,
        user.id.toString(),
        user.username || "Unknown",
        user.timeZone,
        user.emailVerified,
        user.twoFactorEnabled,
        user.identityProvider,
        user.lastActiveAt,
        firstTeam?.name || "Unknown",
        firstTeam?.slug || "Unknown",
        firstTeam?.isOrganization || false,
        (user.metadata as { stripeCustomerId?: string })?.stripeCustomerId || "Unknown"
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
