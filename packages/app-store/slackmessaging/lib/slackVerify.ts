import { createHmac, timingSafeEqual } from "crypto";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let signingSecret = "";

export default async function slackVerify(req: NextApiRequest, res: NextApiResponse) {
  const timeStamp = req.headers["x-slack-request-timestamp"] as string; // Always returns a string and not a string[]
  const slackSignature = req.headers["x-slack-signature"] as string;
  const currentTime = dayjs().unix();
  const { signing_secret } = await getAppKeysFromSlug("slack");
  const [version, hash] = slackSignature.split("=");

  if (typeof signing_secret === "string") signingSecret = signing_secret;

  if (!timeStamp) {
    return res.status(400).json({ message: "Missing X-Slack-Request-Timestamp header" });
  }

  if (!signingSecret) {
    return res.status(400).json({ message: "Missing Slack's signing_secret" });
  }

  if (Math.abs(currentTime - parseInt(timeStamp)) > 60 * 5) {
    return res.status(400).json({ message: "Request is too old" });
  }

  const hmac = createHmac("sha256", signing_secret as string);

  hmac.update(`${version}:${timeStamp}:${stringify(req.body)}`);

  const signed_sig = hmac.digest("hex");
  console.log({ signed_sig, hash, match: signed_sig === hash });
  if (signed_sig !== hash) {
    throw new Error("Hashes do not match ");
  }
}
