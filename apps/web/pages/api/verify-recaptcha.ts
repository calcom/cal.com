import type { NextApiRequest, NextApiResponse } from "next";

import { RECAPTCHA_SECRET_HIGH, RECAPTCHA_SECRET_LOW, RECAPTCHA_SECRET_MEDIUM } from "@calcom/lib/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { token, type = "LOW" } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: "Missing reCAPTCHA token" });
  }

  const reCaptchaMap = {
    LOW: RECAPTCHA_SECRET_LOW,
    MEDIUM: RECAPTCHA_SECRET_MEDIUM,
    HIGH: RECAPTCHA_SECRET_HIGH,
  };

  const RECAPTCHA_SECRET_KEY = reCaptchaMap[type as keyof typeof reCaptchaMap];
  if (typeof RECAPTCHA_SECRET_KEY !== "string") {
    return res.status(500).json({ success: false, error: "Invalid reCAPTCHA secret key" });
  }
  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return res.status(200).json({ success: true, score: data.score });
    } else {
      return res.status(400).json({ success: false, error: data["error-codes"] || "Verification failed" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error verifying reCAPTCHA" });
  }
}
