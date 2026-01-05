import type { NextApiRequest, NextApiResponse } from "next";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";

import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  req.session = await getServerSession({ req });
  const { teamId } = req.query;
  const user = req.session?.user;

  if (!user) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const mergeApiKey = process.env.MERGE_API_KEY;
  if (!mergeApiKey) {
    return res.status(500).json({ message: "Merge API key not configured" });
  }

  try {
    const linkTokenResponse = await fetch("https://api.merge.dev/api/integrations/create-link-token", {
      method: "POST",
      headers: { Authorization: `Bearer ${mergeApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        end_user_origin_id: String(teamId || user.id),
        end_user_organization_name: user.name || user.email || "Cal.com User",
        end_user_email_address: user.email,
        categories: ["ats"],
        integration: "lever",
      }),
    });

    if (!linkTokenResponse.ok) {
      console.error("Failed to create Merge link token");
      return res.status(500).json({ message: "Failed to initiate Lever connection" });
    }

    const { link_token } = await linkTokenResponse.json();

    await createDefaultInstallation({
      appType: `${appConfig.slug}_other_calendar`,
      user,
      slug: appConfig.slug,
      key: {},
      teamId: teamId ? Number(teamId) : undefined,
    });

    res.status(200).json({ url: `https://link.merge.dev/?linkToken=${link_token}`, newTab: true });
  } catch (error) {
    console.error("Error in Lever add handler");
    return res.status(500).json({ message: "Failed to initiate Lever connection" });
  }
}
