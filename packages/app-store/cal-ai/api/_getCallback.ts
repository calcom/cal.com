import type { NextApiRequest, NextApiResponse } from "next";

import { defaultResponder } from "@calcom/lib/server";
import { createContext } from "@calcom/trpc/server/createContext";
import { apiKeysRouter } from "@calcom/trpc/server/routers/viewer/apiKeys/_router";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import { withStripeCallback } from "../../_utils/paid-apps";
import appConfig from "../config.json";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  const slug = appConfig.slug;
  const appType = appConfig.type;

  const { checkoutId } = req.query as { checkoutId: string };
  if (!checkoutId) {
    return { url: `/apps/installed?error=${JSON.stringify({ message: "No Stripe Checkout Session ID" })}` };
  }

  const { url } = await withStripeCallback(checkoutId, slug, async ({ checkoutSession }) => {
    const ctx = await createContext({ req, res });
    const caller = apiKeysRouter.createCaller(ctx);

    const apiKey = await caller.create({
      note: "Cal.ai",
      expiresAt: null,
      appId: "cal-ai",
    });

    await checkInstalled(slug, session.user.id);
    await createDefaultInstallation({
      appType,
      userId: session.user.id,
      slug,
      key: {
        apiKey,
      },
      subscriptionId: checkoutSession.subscription?.toString(),
      billingCycleStart: new Date().getDate(),
      paymentStatus: "active",
    });

    await fetch(
      `${process.env.NODE_ENV === "development" ? "http://localhost:3005" : "https://cal.ai"}/api/onboard`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      }
    );

    return { url: getInstalledAppPath({ variant: appConfig.variant, slug: "cal-ai" }) };
  });

  return res.redirect(url);
}

export default defaultResponder(getHandler);
