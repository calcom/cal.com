import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { getAppOnboardingRedirectUrl } from "@calcom/lib/getAppOnboardingRedirectUrl";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import type { StripeData } from "../lib/server";
import stripe from "../lib/server";

function getReturnToValueFromQueryState(req: NextApiRequest) {
  let returnTo = "";
  try {
    returnTo = JSON.parse(`${req.query.state}`).returnTo;
  } catch (error) {
    console.info("No 'returnTo' in req.query.state");
  }
  return returnTo;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, error_description } = req.query;

  if (error) {
    const query = stringify({ error, error_description });
    res.redirect(`/apps/installed?${query}`);
    return;
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code: code?.toString(),
  });

  const data: StripeData = { ...response, default_currency: "" };
  if (response["stripe_user_id"]) {
    const account = await stripe.accounts.retrieve(response["stripe_user_id"]);
    data["default_currency"] = account.default_currency;
  }

  await createOAuthAppCredential(
    { appId: "stripe", type: "stripe_payment" },
    data as unknown as Prisma.InputJsonObject,
    req
  );

  const state = decodeOAuthState(req);

  if (state?.returnToOnboarding) {
    return res.redirect(getAppOnboardingRedirectUrl("stripe", state.teamId));
  }

  const returnTo = getReturnToValueFromQueryState(req);
  res.redirect(returnTo || getInstalledAppPath({ variant: "payment", slug: "stripe" }));
}
