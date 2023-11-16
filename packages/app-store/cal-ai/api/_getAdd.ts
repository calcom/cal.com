import type { NextApiRequest, NextApiResponse } from "next";

import { defaultResponder } from "@calcom/lib/server";
import { createContext } from "@calcom/trpc/server/createContext";
import { apiKeysRouter } from "@calcom/trpc/server/routers/viewer/apiKeys/_router";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import { withPaidAppRedirect } from "../../_utils/paid-apps";
import appConfig from "../config.json";

const trialEndDate = new Date(Date.UTC(2023, 11, 1));

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);

  // if date is in the future, we install normally.
  if (new Date() < trialEndDate) {
    const ctx = await createContext({ req, res });
    const caller = apiKeysRouter.createCaller(ctx);

    const apiKey = await caller.create({
      note: "Cal.ai",
      expiresAt: null,
      appId: "cal-ai",
    });

    await checkInstalled(appConfig.slug, session.user.id);
    await createDefaultInstallation({
      appType: appConfig.type,
      userId: session.user.id,
      slug: appConfig.slug,
      key: {
        apiKey,
      },
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
  }

  const redirectUrl = await withPaidAppRedirect({
    appPaidMode: appConfig.paid.mode,
    appSlug: appConfig.slug,
    userId: session.user.id,
    priceId: appConfig.paid.priceId,
  });

  if (!redirectUrl) {
    return res.status(500).json({ message: "Failed to create Stripe checkout session" });
  }

  return { url: redirectUrl };
}

export default defaultResponder(getHandler);
