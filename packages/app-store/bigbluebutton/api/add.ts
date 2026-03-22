import type { NextApiRequest, NextApiResponse } from "next";
import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { BBBApi } from "../lib/bbb-api";

/**
 * BigBlueButton app installation endpoint
 * Validates BBB server connection before saving credentials
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { teamId, returnTo } = req.query;
  const { serverUrl, sharedSecret } = req.body;

  // Validate required fields
  if (!serverUrl || !sharedSecret) {
    return res.status(400).json({ 
      message: "Server URL and Shared Secret are required" 
    });
  }

  // Validate server URL format
  try {
    const url = new URL(serverUrl);
    if (!url.protocol.startsWith("http")) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return res.status(400).json({ 
      message: "Invalid server URL format. Please provide a valid HTTP or HTTPS URL." 
    });
  }

  await throwIfNotHaveAdminAccessToTeam({
    teamId: teamId ? Number(teamId) : null,
    userId: req.session.user.id,
  });

  const installForObject = teamId ? { teamId: Number(teamId) } : { userId: req.session.user.id };
  const appType = "bigbluebutton_video";

  try {
    // Check if already installed to prevent duplicates
    const existingInstallation = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...installForObject,
      },
    });

    if (existingInstallation) {
      return res.status(400).json({ 
        message: "BigBlueButton is already installed" 
      });
    }

    // Test BBB server connection with proper auth validation
    const bbbApi = new BBBApi({ serverUrl, sharedSecret });
    const isConnected = await bbbApi.testConnection();

    if (!isConnected) {
      return res.status(400).json({ 
        message: "Could not connect to BigBlueButton server. Please verify the server URL and shared secret." 
      });
    }

    // Create the credential after successful connection test
    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {
          serverUrl: serverUrl.replace(/\/+$/, ""), // Remove trailing slashes
          sharedSecret,
        },
        ...installForObject,
        appId: "bigbluebutton",
      },
    });

    if (!installation) {
      throw new Error("Unable to create BigBlueButton credential");
    }

    return res.status(200).json({ 
      url: returnTo ?? getInstalledAppPath({ variant: "conferencing", slug: "bigbluebutton" }),
      message: "BigBlueButton successfully configured!"
    });

  } catch (error: unknown) {
    // Log safe error message without sensitive credentials
    console.error("BigBlueButton installation error:", error instanceof Error ? error.message : "Unknown error");
    const httpError = getServerErrorFromUnknown(error);
    return res.status(httpError.statusCode).json({ message: httpError.message });
  }
}