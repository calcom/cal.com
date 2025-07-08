import type { NextApiRequest, NextApiResponse } from "next";

import { isENVDev } from "@calcom/lib/env";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { scopeString } from "../lib/utils";
import { appKeysSchema } from "../zod";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const loggedInUser = req.session?.user;

  if (!loggedInUser) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in!" });
  }

  // Ideally this should never happen, as email is there in session user but typings aren't accurate it seems
  // TODO: So, confirm and later fix the typings
  if (!loggedInUser.email) {
    throw new HttpError({ statusCode: 400, message: "Session user must have an email" });
  }

  const { teamId } = req.query;

  const { client_id, redirect_uris } = await getParsedAppKeysFromSlug("deel", appKeysSchema);
  const url = new URL(`https://app.${isENVDev ? "demo." : ""}deel.com/oauth2/authorize`);
  url.searchParams.append("client_id", client_id);
  url.searchParams.append("redirect_uri", redirect_uris);
  url.searchParams.append("scope", scopeString);
  url.searchParams.append("response_type", "code");
  if (typeof teamId === "string" && !Number.isNaN(Number(teamId))) {
    url.searchParams.append("state", JSON.stringify({ teamId: Number(teamId) }));
  }

  return res.status(200).json({ url: url.toString() });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
