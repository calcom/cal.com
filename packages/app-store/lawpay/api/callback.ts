import type { NextApiRequest, NextApiResponse } from "next";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["lawpay", "callback"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { code, state, error } = req.query;

    if (error) {
      log.error("OAuth callback error", { error });
      return res.redirect(`/apps/lawpay/setup?error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      log.error("Missing required parameters", { code, state });
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Here you would typically exchange the code for an access token
    // For now, we'll just redirect to the setup page with success
    log.info("OAuth callback received", { code, state });

    res.redirect("/apps/lawpay/setup?callback=true&success=true");
  } catch (error) {
    log.error("Error in OAuth callback", getErrorFromUnknown(error));
    res.status(500).json({ message: "Internal server error" });
  }
}
