import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

type GoogleVerificationResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  challenge_ts?: number;
  hostname?: string;
};

type Response = {
  error?: string;
} & GoogleVerificationResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  if (req.method.toLowerCase() === "post") {
    const GOOGLE_RECAPTCHA_SITE_SECRET = process.env.GOOGLE_RECAPTCHA_SITE_SECRET;
    if (!GOOGLE_RECAPTCHA_SITE_SECRET)
      res.status(400).json({ error: "GOOGLE_RECAPTCHA_SITE_SECRET is required in env" });

    const captchaValidationToken = req.query.captchaValidationToken;
    if (!captchaValidationToken) res.status(400).json({ error: "captchaValidationToken is required" });

    const googleCaptchaValidationResponse = await axios.post<GoogleVerificationResponse>(
      `https://www.google.com/recaptcha/api/siteverify?secret=${GOOGLE_RECAPTCHA_SITE_SECRET}&response=${captchaValidationToken}`
    );

    if (googleCaptchaValidationResponse.status !== 200 || !googleCaptchaValidationResponse.data)
      return res.status(400).json({ error: googleCaptchaValidationResponse.statusText });

    return res.status(200).json(googleCaptchaValidationResponse.data);
  }

  return res.status(404).json({ error: "Invalid Http Method" });
}
