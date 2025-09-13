import type { NextApiRequest, NextApiResponse } from "next";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { lawPayCredentialSchema } from "../types";

const log = logger.getSubLogger({ prefix: ["lawpay", "add"] });

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { body } = req;
    const credentialData = lawPayCredentialSchema.parse(body);

    // Check if user already has LawPay credentials
    const existingCredential = await prisma.credential.findFirst({
      where: {
        userId: req.session.user.id,
        type: "lawpay_payment",
      },
    });

    if (existingCredential) {
      // Update existing credential
      await prisma.credential.update({
        where: {
          id: existingCredential.id,
        },
        data: {
          key: credentialData,
        },
      });
    } else {
      // Create new credential
      await prisma.credential.create({
        data: {
          type: "lawpay_payment",
          key: credentialData,
          userId: req.session.user.id,
          appId: "lawpay",
        },
      });
    }

    log.info("LawPay credentials added successfully", { userId: req.session.user.id });

    return res.status(200).json({
      url: "/apps/lawpay/setup?success=true",
    });
  } catch (error) {
    log.error("Error adding LawPay credentials", getErrorFromUnknown(error));
    return res.status(500).json({ message: "Failed to add LawPay credentials" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
