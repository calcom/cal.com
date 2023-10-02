import type { Prisma } from "@prisma/client";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { getSlackAppKeys } from "../lib/getSlackAppKeys";

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
    res.redirect("/apps/installed?" + query);
    return;
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { client_id, client_secret } = await getSlackAppKeys();

  const slackConnectParams = {
    client_id,
    client_secret,
    code: code as string,
    grant_type: "authorization_code",
    // redirect_uri (passed in add.ts) is needed as per slack docs
    redirect_uri: encodeURI(WEBAPP_URL + "/api/integrations/slack/callback"),
  };

  const formBody: string[] = [];
  Object.entries(slackConnectParams).forEach(([key, value]) => {
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    formBody.push(`${encodedKey}=${encodedValue}`);
  });
  const formData = formBody.join("&");

  const slackOAuthV2AccessURL = "https://slack.com/api/oauth.v2.access";

  const { data } = await axios({
    method: "POST",
    url: slackOAuthV2AccessURL,
    data: formData,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  await createOAuthAppCredential(
    { appId: "slack", type: "slack_messaging" },
    data as unknown as Prisma.InputJsonObject,
    req
  );

  const returnTo = getReturnToValueFromQueryState(req);
  res.redirect(returnTo || getInstalledAppPath({ variant: "messaging", slug: "slack" }));
}
