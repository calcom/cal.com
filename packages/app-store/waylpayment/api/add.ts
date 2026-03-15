import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";

import config from "../config.json";
import WaylClient from "../lib/WaylClient";

const saveSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  credentialId: z.number(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId } = req.query;
  const teamIdNumber = teamId ? Number(teamId) : null;
  await throwIfNotHaveAdminAccessToTeam({ teamId: teamIdNumber, userId: req.session.user.id });
  const installForObject = teamIdNumber ? { teamId: teamIdNumber } : { userId: req.session.user.id };

  // GET — called by Cal.com App Store when user clicks "Install".
  // Creates an empty credential and redirects to the setup page.
  if (req.method === "GET") {
    try {
      const alreadyInstalled = await prisma.credential.findFirst({
        where: { type: config.type, ...installForObject },
      });
      if (!alreadyInstalled) {
        await prisma.credential.create({
          data: {
            type: config.type,
            key: {},
            appId: "waylpayment",
            ...installForObject,
          },
        });
      }
    } catch (error: unknown) {
      const httpError = getServerErrorFromUnknown(error);
      return res.status(httpError.statusCode).json({ message: httpError.message });
    }
    return res.status(200).json({
      url: `/apps/waylpayment/setup${teamIdNumber ? `?teamId=${teamIdNumber}` : ""}`,
    });
  }

  // POST — called from the setup page to validate and save the API key.
  if (req.method === "POST") {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { apiKey, credentialId } = parsed.data;

    // Validate the key against Wayl before saving
    const client = new WaylClient(apiKey);
    const isValid = await client.verifyKey();
    if (!isValid) {
      return res.status(400).json({ message: "Invalid Wayl API key. Please check your key and try again." });
    }

    // Ensure the credential belongs to this user
    const credential = await prisma.credential.findFirst({
      where: { id: credentialId, ...installForObject },
    });
    if (!credential) {
      return res.status(404).json({ message: "Credential not found." });
    }

    await prisma.credential.update({
      where: { id: credentialId },
      data: { key: { apiKey } },
    });

    return res.status(200).json({ url: "/apps/installed/payment" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
