import { createHmac } from "crypto";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import appStore from "@calcom/app-store";

import { HttpError } from "@lib/core/http/error";

const signingSecret = process.env.SLACK_SIGNING_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { args } = req.query;

  const body = req.body;
  const timeStamp = req.headers["x-slack-request-timestamp"] as string; // Always returns a string and not a string[]
  const slackSignature = req.headers["x-slack-signature"] as string;
  const currentTime = dayjs().unix();

  if (!timeStamp) {
    return res.status(400).json({ message: "Missing X-Slack-Request-Timestamp header" });
  }

  if (!signingSecret) {
    return res.status(400).json({ message: "Missing process.env.SLACK_SIGNING_SECRET" });
  }

  if (Math.abs(currentTime - parseInt(timeStamp)) > 60 * 5) {
    return res.status(400).json({ message: "Request is too old" });
  }

  const signature_base = `v0:${timeStamp}:${stringify(body)}`;
  const signed_sig = "v0=" + createHmac("sha256", signingSecret).update(signature_base).digest("hex");

  if (signed_sig !== slackSignature) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }

  const [_appName, apiEndpoint] = args;
  const appName = _appName.split("_").join("");

  try {
    const handler = appStore[appName].api[apiEndpoint];
    console.log(`API: ${appName}/${apiEndpoint}`);
    if (typeof handler !== "function")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    const response = await handler(req, res);
    console.log("response", response);

    res.status(200);
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(404).json({ message: `API handler not found` });
  }

  // Return a response to acknowledge receipt of the event
}
