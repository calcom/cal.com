import type { NextApiRequest, NextApiResponse } from "next";
import { defaultResponder } from "@calcom/lib/server";
import { prisma } from "@calcom/prisma";
import BigBlueButtonVideoApiAdapter from "../lib/VideoApiAdapter";

/**
 * API endpoint to check BigBlueButton connection
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { credentialId } = req.query;

  if (!credentialId || typeof credentialId !== "string") {
    return res.status(400).json({ error: "Missing credentialId" });
  }

  try {
    const credential = await prisma.credential.findUnique({
      where: { id: parseInt(credentialId) },
    });

    if (!credential) {
      return res.status(404).json({ error: "Credential not found" });
    }

    const adapter = new BigBlueButtonVideoApiAdapter(credential);
    const isAvailable = await adapter.checkServerStatus();

    return res.status(200).json({
      status: isAvailable ? "connected" : "disconnected",
      message: isAvailable
        ? "Successfully connected to BigBlueButton server"
        : "Failed to connect to BigBlueButton server",
    });
  } catch (error) {
    console.error("BBB connection check failed:", error);
    return res.status(500).json({
      error: "Failed to check connection",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default defaultResponder(handler);
