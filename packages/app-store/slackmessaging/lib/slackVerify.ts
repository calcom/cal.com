import { createHmac } from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import dayjs from "@calcom/dayjs";

import { getSlackAppKeys } from "./utils";

export default async function slackVerify(req: NextApiRequest, res: NextApiResponse) {
  const timeStamp = req.headers["x-slack-request-timestamp"] as string; // Always returns a string and not a string[]
  const slackSignature = req.headers["x-slack-signature"] as string;
  const currentTime = dayjs().unix();
  const { signing_secret: signingSecret } = await getSlackAppKeys();
  const [version, hash] = slackSignature.split("=");

  if (!timeStamp) {
    return res.status(400).json({ message: "Missing X-Slack-Request-Timestamp header" });
  }

  if (!signingSecret) {
    return res.status(400).json({ message: "Missing Slack's signing_secret" });
  }

  if (Math.abs(currentTime - parseInt(timeStamp)) > 60 * 5) {
    return res.status(400).json({ message: "Request is too old" });
  }

  const hmac = createHmac("sha256", signingSecret);

  hmac.update(`${version}:${timeStamp}:${stringify(req.body)}`);

  const signed_sig = hmac.digest("hex");
  console.log({ signed_sig, hash, match: signed_sig === hash });
  if (signed_sig !== hash) {
    throw new Error("Hashes do not match ");
  }
}
