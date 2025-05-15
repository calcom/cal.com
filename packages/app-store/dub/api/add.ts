import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { dubAppKeysSchema, scopeString } from "../lib/utils";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const loggedInUser = req.session?.user;

  if (!loggedInUser) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  // Ideally this should never happen, as email is there in session user but typings aren't accurate it seems
  // TODO: So, confirm and later fix the typings
  if (!loggedInUser.email) {
    throw new HttpError({ statusCode: 400, message: "Session user must have an email" });
  }

  const { client_id, redirect_uris } = await getParsedAppKeysFromSlug("dub", dubAppKeysSchema);

  const oauthUrl = `https://app.dub.co/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uris}&response_type=code&scope=${scopeString}`;

  return res.status(200).json({ url: oauthUrl });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
