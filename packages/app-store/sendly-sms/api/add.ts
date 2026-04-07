import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey } = req.body;

  if (!apiKey) {
    return res.redirect(
      "https://sendly.live/integrations/calcom?source=calcom-appstore"
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://sendly.live/api/v1/account", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(400).json({ error: "Invalid Sendly API key" });
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return res.status(504).json({ error: "Sendly API validation timed out" });
    }
    return res.status(500).json({ error: "Failed to validate API key" });
  }

  return res.redirect(
    `https://sendly.live/integrations/calcom?source=calcom-appstore&prefill=true`
  );
}
