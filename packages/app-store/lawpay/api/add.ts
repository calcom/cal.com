import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";
import { throwIfNotHaveAdminAccessToTeam } from "../../_utils/throwIfNotHaveAdminAccessToTeam";
import config from "../config.json";
import { lawPayCredentialSchema } from "../types";

const log = logger.getSubLogger({ prefix: ["lawpay", "add"] });

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId } = req.query;
  const teamIdNumber = teamId ? Number(teamId) : null;

  await throwIfNotHaveAdminAccessToTeam({ teamId: teamIdNumber, userId: req.session.user.id });
  const installForObject = teamIdNumber ? { teamId: teamIdNumber } : { userId: req.session.user.id };

  const appType = config.type as string;
  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...installForObject,
      },
    });
    if (alreadyInstalled) {
      return res.status(200).json({
        url: `/apps/lawpay/setup${teamIdNumber ? `?teamId=${teamIdNumber}` : ""}`,
      });
    }
    await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        appId: "lawpay",
        ...(teamIdNumber ? { teamId: teamIdNumber } : { userId: req.session.user.id }),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
    log.error("Error installing LawPay", getErrorFromUnknown(error));
    return res.status(500).json({ message });
  }

  return res.status(200).json({
    url: `/apps/lawpay/setup${teamIdNumber ? `?teamId=${teamIdNumber}` : ""}`,
  });
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { body } = req;

    // No body or empty body: treat as install (same as GET)
    if (!body || Object.keys(body).length === 0) {
      return getHandler(req, res);
    }

    const credentialData = lawPayCredentialSchema.parse(body);

    const { teamId } = req.query;
    const teamIdNumber = teamId ? Number(teamId) : null;
    await throwIfNotHaveAdminAccessToTeam({ teamId: teamIdNumber, userId: req.session.user.id });
    const installForObject = teamIdNumber ? { teamId: teamIdNumber } : { userId: req.session.user.id };

    const existingCredential = await prisma.credential.findFirst({
      where: {
        type: "lawpay_payment",
        ...installForObject,
      },
      select: { id: true },
    });

    if (existingCredential) {
      await prisma.credential.update({
        where: { id: existingCredential.id },
        data: { key: credentialData as object },
      });
    } else {
      await prisma.credential.create({
        data: {
          type: "lawpay_payment",
          key: credentialData as object,
          appId: "lawpay",
          ...(teamIdNumber ? { teamId: teamIdNumber } : { userId: req.session.user.id }),
        },
      });
    }

    log.info("LawPay credentials saved successfully", { userId: req.session.user.id });

    return res.status(200).json({
      url: `/apps/lawpay/setup?success=true${teamIdNumber ? `&teamId=${teamIdNumber}` : ""}`,
    });
  } catch (error) {
    // Handle Zod validation errors as client errors (400)
    if (error instanceof z.ZodError) {
      log.warn("LawPay credentials validation failed", { errors: error.issues });
      return res.status(400).json({ 
        message: "Invalid credentials format",
        errors: error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
      });
    }
    log.error("Error adding LawPay credentials", getErrorFromUnknown(error));
    return res.status(500).json({ message: "Failed to add LawPay credentials" });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
