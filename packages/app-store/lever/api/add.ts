import type { NextApiRequest, NextApiResponse } from "next";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";

import appConfig from "../config.json";

/**
 * Handler for adding/installing the Lever integration.
 * This initiates the Merge.dev OAuth flow to connect the user's Lever account.
 *
 * Merge.dev OAuth Documentation:
 * https://docs.merge.dev/guides/merge-link/
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Check that user is authenticated
  req.session = await getServerSession({ req });
  const { teamId } = req.query;
  const user = req.session?.user;

  if (!user) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const mergeApiKey = process.env.MERGE_API_KEY;
  if (!mergeApiKey) {
    return res.status(400).json({ message: "Merge API key not configured" });
  }

  try {
    // Create a link token for Merge Link
    const linkTokenResponse = await fetch("https://api.merge.dev/api/integrations/create-link-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mergeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        end_user_origin_id: String(teamId || user.id),
        end_user_organization_name: user.name || user.email || "Cal.com User",
        end_user_email_address: user.email,
        categories: ["ats"],
        integration: "lever",
      }),
    });

    if (!linkTokenResponse.ok) {
      const errorText = await linkTokenResponse.text();
      console.error("Failed to create Merge link token:", errorText);
      return res.status(500).json({ message: "Failed to initiate Lever connection" });
    }

    const { link_token } = await linkTokenResponse.json();

    // Create default installation record
    await createDefaultInstallation({
      appType: `${appConfig.slug}_other_calendar`,
      user,
      slug: appConfig.slug,
      key: {},
      teamId: teamId ? Number(teamId) : undefined,
    });

    // Return the Merge Link URL for the frontend to open
    res.status(200).json({
      url: `https://link.merge.dev/?linkToken=${link_token}`,
      newTab: true,
    });
  } catch (error) {
    console.error("Error in Lever add handler:", error);
    return res.status(500).json({ message: "Failed to initiate Lever connection" });
  }
}
