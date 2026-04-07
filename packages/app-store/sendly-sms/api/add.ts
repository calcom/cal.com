import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Called when the Sendly SMS app is installed on a Cal.com account.
 *
 * Flow:
 * 1. User installs the app from Cal.com App Store
 * 2. Cal.com calls this handler with the user's credentials
 * 3. We redirect to the Sendly integration setup page
 *
 * The actual webhook creation and API key storage happens on the
 * Sendly side at /integrations/calcom, keeping credentials secure.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.redirect(
      "https://sendly.live/integrations/calcom?source=calcom-appstore"
    );
  }

  // Validate the Sendly API key
  try {
    const response = await fetch("https://sendly.live/api/v1/account", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return res.status(400).json({ error: "Invalid Sendly API key" });
    }
  } catch {
    return res.status(500).json({ error: "Failed to validate API key" });
  }

  // Redirect to Sendly's Cal.com integration page to complete setup
  return res.redirect(
    `https://sendly.live/integrations/calcom?source=calcom-appstore&prefill=true`
  );
}
