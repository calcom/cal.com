import type { Params } from "app/_types";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const querySchema = z.object({
  team: z.string().transform((val) => parseInt(val)),
  session_id: z.string().min(1),
});

async function getHandler(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { team: id, session_id } = querySchema.parse({
      team: (await params).team,
      session_id: searchParams.get("session_id"),
    });

    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });
    if (!checkoutSession) {
      throw new HttpError({ statusCode: 404, message: "Checkout session not found" });
    }

    const subscription = checkoutSession.subscription as Stripe.Subscription;
    if (checkoutSession.payment_status !== "paid") {
      throw new HttpError({ statusCode: 402, message: "Payment required" });
    }

    let team = await prisma.team.findFirst({
      where: { metadata: { path: ["paymentId"], equals: checkoutSession.id } },
    });

    let metadata;

    if (!team) {
      const prevTeam = await prisma.team.findFirstOrThrow({ where: { id } });

      metadata = teamMetadataStrictSchema.safeParse(prevTeam.metadata);
      if (!metadata.success) {
        throw new HttpError({ statusCode: 400, message: "Invalid team metadata" });
      }

      const { requestedSlug, ...newMetadata } = metadata.data || {};
      team = await prisma.team.update({
        where: { id },
        data: {
          metadata: {
            ...newMetadata,
            paymentId: checkoutSession.id,
            subscriptionId: subscription.id || null,
            subscriptionItemId: subscription.items.data[0].id || null,
          },
        },
      });

      const slug = prevTeam.slug || requestedSlug;
      if (slug) {
        try {
          team = await prisma.team.update({ where: { id }, data: { slug } });
        } catch (error) {
          const { message, statusCode } = getRequestedSlugError(error, slug);
          return NextResponse.json({ message }, { status: statusCode });
        }
      }
    }

    if (!metadata) {
      metadata = teamMetadataStrictSchema.safeParse(team.metadata);
      if (!metadata.success) {
        throw new HttpError({ statusCode: 400, message: "Invalid team metadata" });
      }
    }

    const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

    if (!session) {
      return NextResponse.json({ message: "Team upgraded successfully" });
    }

    const redirectUrl = team?.isOrganization
      ? `${WEBAPP_URL}/settings/organizations/profile?upgraded=true`
      : `${WEBAPP_URL}/settings/teams/${team.id}/profile?upgraded=true`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const GET = defaultResponderForAppDir(getHandler);
