import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { appKeysSchema } from "../zod";
import { validateBBBServer } from "../lib/bbbapi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { teamId } = req.query;
  const userId = req.session.user.id;

  // Validate and parse input
  const parseResult = appKeysSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid configuration",
      errors: parseResult.error.flatten().fieldErrors,
    });
  }
  const keys = parseResult.data;

  // Validate the BBB server before saving
  try {
    await validateBBBServer(keys);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Could not connect to BigBlueButton server",
    });
  }

  // Find the credential to update
  const whereClause = teamId
    ? { type: "bigbluebutton_video", teamId: Number(teamId) }
    : { type: "bigbluebutton_video", userId };

  try {
    await prisma.credential.updateMany({
      where: whereClause,
      data: { key: keys },
    });
    return res.status(200).json({ message: "Saved successfully" });
  } catch (error) {
    console.error("Failed to save BigBlueButton credentials:", error);
    return res.status(500).json({ message: "Failed to save credentials" });
  }
}
