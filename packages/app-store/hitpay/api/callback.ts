// import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

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
  console.log("hitpay callback query =>", req.query);
  const state = decodeOAuthState(req);

  if (error) {
    // User cancels flow
    if (error === "access_denied") {
      state?.onErrorReturnTo ? res.redirect(state.onErrorReturnTo) : res.redirect("/apps/installed/payment");
    }
    const query = stringify({ error, error_description });
    res.redirect(`/apps/installed?${query}`);
    return;
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const returnTo = getReturnToValueFromQueryState(req);
  res.redirect(returnTo || getInstalledAppPath({ variant: "payment", slug: "hitpay" }));
}
