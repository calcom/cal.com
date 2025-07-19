import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { lawPayCredentialSchema } from "../types";

const log = logger.getSubLogger({ prefix: ["lawpay", "add"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getSession({ req });
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { body } = req;
    const credentialData = lawPayCredentialSchema.parse(body);

    // Check if user already has LawPay credentials
    const existingCredential = await prisma.credential.findFirst({
      where: {
        userId: session.user.id,
        type: "lawpay_payment",
      },
    });

    if (existingCredential) {
      // Update existing credential
      await prisma.credential.update({
        where: { id: existingCredential.id },
        data: {
          key: credentialData,
        },
      });
    } else {
      // Create new credential
      await prisma.credential.create({
        data: {
          userId: session.user.id,
          type: "lawpay_payment",
          key: credentialData,
          appId: "lawpay",
        },
      });
    }

    log.info("LawPay credentials added successfully", { userId: session.user.id });
    res.status(200).json({ message: "LawPay credentials added successfully" });
  } catch (error) {
    log.error("Error adding LawPay credentials", getErrorFromUnknown(error));
    res.status(500).json({ message: "Internal server error" });
  }
}
