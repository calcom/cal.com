import { createHmac } from "crypto";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import appStore from "@calcom/app-store";

import { HttpError } from "@lib/core/http/error";

const signingSecret = process.env.SLACK_SIGNING_SECRET;

function verifyHash(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;
  const timeStamp = req.headers["x-slack-request-timestamp"] as string; // Always returns a string and not a string[]
  const slackSignature = req.headers["x-slack-signature"] as string;
  const currentTime = dayjs().unix();

  // Ensure that there is a timestamp
  if (!timeStamp) {
    return res.status(400).json({ message: "Missing X-Slack-Request-Timestamp header" });
  }

  // If there is no signging secret in env there is no way to check that the request is valid.
  if (!signingSecret) {
    return res.status(400).json({ message: "Missing process.env.SLACK_SIGNING_SECRET" });
  }

  // Ensure that the timestamp is within the last 5 minutes (300 seconds)
  if (Math.abs(currentTime - parseInt(timeStamp)) > 60 * 5) {
    return res.status(400).json({ message: "Request is too old" });
  }

  const hmac = createHmac("sha256", signingSecret);
  const [version, hash] = slackSignature.split("=");

  const payload = body.payload && JSON.parse(body.payload);
  console.log(payload);

  hmac.update(`${version}:${timeStamp}:${stringify(payload ? { payload } : body)}`);
  const digest = hmac.digest("hex");

  // TODO: This still fails on and custom selections - need to figure out how to handle this. Normal slack actions do not produce an invalid signature.
  if (digest !== hash) {
    return res.status(400).json({ message: "Invalid signature" });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: verifyHash(req, res); // Verify that this request is coming from slack

  const { args } = req.query;
  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }

  // Handle routes to mono repo
  // This is a hack to get the app store to work with the mono repo.
  const [_appName, apiEndpoint] = args;
  const appName = _appName.split("_").join("");

  try {
    const handler = appStore[appName].api[apiEndpoint];
    console.log(`API: ${appName}/${apiEndpoint}`);
    if (typeof handler !== "function")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    await handler(req, res);
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
