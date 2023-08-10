import type { Prisma } from "@prisma/client";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import createOAuthAppCredential from "../../_utils/createOAuthAppCredential";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";

// import type { StripeData } from "../lib/server";
// import stripe from "../lib/server";

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
  console.log("===== isnide callback handler========");
  const { code, error, error_description } = req.query;

  const client_secret = "9135186f69e6180dbe0b7e9d30783b8935";
  const client_id = "5719933161091.572251138641812";
  const slackOAuthV2AccessURL = "https://slack.com/api/oauth.v2.access";

  if (error) {
    const query = stringify({ error, error_description });
    res.redirect("/apps/installed?" + query);
    return;
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  console.log("========oauth callback===========");
  console.log(code);

  const slackConnectParams = {
    client_id,
    client_secret,
    code: code as string,
    grant_type: "authorization_code",
    redirect_uri: encodeURI(
      "https://69b3-2405-201-c02d-983c-d8bb-586d-f127-fda7.ngrok-free.app" +
        "/api/integrations/slack/callback"
    ),
  };
  console.log(slackConnectParams);
  const formBody: string[] = [];
  Object.entries(slackConnectParams).forEach(([key, value]) => {
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    formBody.push(`${encodedKey}=${encodedValue}`);
  });
  const formData = formBody.join("&");
  /** stringify is being dumb here */

  const { data } = await axios({
    method: "POST",
    url: slackOAuthV2AccessURL,
    data: formData,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  console.log({
    method: "POST",
    url: slackOAuthV2AccessURL,
    data: formData,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  console.log("SLACK DATA", data);

  await createOAuthAppCredential(
    { appId: "slack", type: "slack" },
    data as unknown as Prisma.InputJsonObject,
    req
  );

  console.log("created credential");

  const returnTo = undefined;
  res.redirect(returnTo || getInstalledAppPath({ variant: "messaging", slug: "slack" }));
}

// curl -F code=5719933161091.5725881391556.e6d245dcc7603f2172df4cb1fd7bf047691353859af781ef3b859deaaf0c1176 -F client_id=3336676.569200954261 -F client_secret=ABCDEFGH https://slack.com/api/oauth.v2.access
