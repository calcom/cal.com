/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { updateManagedZohoUserRequestSchema } from "../../validation/schemas";

async function postHandler(req: NextApiRequest & { prisma: any }) {
  const body = updateManagedZohoUserRequestSchema.parse(req.body);
  const prisma: PrismaClient = req.prisma;

  const existingSetupEntry = await prisma.zohoSchedulingSetup.findFirst({
    where: {
      zuid: body.zuid,
    },
  });
  if (!existingSetupEntry || !existingSetupEntry.userId) {
    throw new Error("zoho user managed setup has not started");
  }

  if (existingSetupEntry.status !== "Completed") {
    throw new Error("zoho user managed setup cannot be updated");
  }

  // update schedule
  // TODO

  // update zoom user
  const appData = { appId: "zoom", type: "zoom_video" };
  const zoomKey = {
    user_id: body.zoomUserId,
    scope: "meeting:write",
    expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 20)).valueOf(),
    token_type: "bearer",
    access_token: "-",
    refresh_token: "-",
  };

  await prisma.credential.update({
    where: {
      type: appData.type,
      userId: existingSetupEntry.userId,
      appId: appData.appId,
    },
    data: {
      key: zoomKey,
    },
  });

  return {
    message: "Managed setup updated",
  };
}

export default defaultResponder(postHandler);
