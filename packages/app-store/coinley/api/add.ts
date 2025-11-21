import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import type { Prisma } from "@prisma/client";
import { appKeysSchema } from "../zod";

/**
 * API endpoint to install Coinley payment app
 * This handles API key-based authentication (not OAuth)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check authentication
    const session = await getServerSession({ req, res });

    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate request body
    const { api_key, api_secret } = req.body;

    // Always use API URL from environment variable (users should not configure this)
    // Note: SDK adds /api path automatically, so base URL should not include it
    const api_url = process.env.COINLEY_API_URL;

    if (!api_url) {
      return res.status(500).json({
        message: "Server configuration error: COINLEY_API_URL environment variable not set"
      });
    }

    // Validate credentials using Zod schema
    // Note: Wallet addresses are configured in Coinley merchant dashboard, not during installation
    const credentials = appKeysSchema.parse({
      api_key,
      api_secret,
      api_url,
    });

    // Check if credential already exists for this user
    const existingCredential = await prisma.credential.findFirst({
      where: {
        type: "coinley_payment",
        userId: session.user.id,
        appId: "coinley",
      },
      select: {
        id: true,
      },
    });

    if (existingCredential) {
      // Update existing credential
      await prisma.credential.update({
        where: { id: existingCredential.id },
        data: {
          key: credentials as unknown as Prisma.InputJsonObject,
          invalid: false,
        },
      });

      console.log("[Coinley] Credentials updated successfully");
    } else {
      // Create new credential
      await prisma.credential.create({
        data: {
          type: "coinley_payment",
          key: credentials as unknown as Prisma.InputJsonObject,
          userId: session.user.id,
          appId: "coinley",
          invalid: false,
        },
      });

      console.log("[Coinley] Credentials created successfully");
    }

    // Return success
    return res.status(200).json({
      success: true,
      message: "Coinley app installed successfully",
      redirectUrl: "/apps/installed/payment",
    });
  } catch (error: any) {
    console.error("[Coinley] Error installing app:", error);

    // Handle Zod validation errors
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to install Coinley app",
    });
  }
}
