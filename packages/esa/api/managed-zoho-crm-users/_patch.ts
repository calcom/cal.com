/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";
import { updateUserScheduleHandler } from "@calcom/trpc/server/routers/viewer/availability/schedule/update.handler";

import { updateManagedZohoUserRequestSchema } from "../../validation/schemas";

async function patchHandler(req: NextApiRequest) {
  const $req = req as NextApiRequest & { prisma: any };

  const body = updateManagedZohoUserRequestSchema.parse($req.body);
  const prisma: PrismaClient = $req.prisma;

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
  const user = await prisma.user.findUnique({
    where: {
      id: Number(body.userId),
    },
  });
  await updateUserScheduleHandler({ ctx: { user }, input: body.schedule } as any);

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

  const credential = await prisma.credential.findFirst({
    where: {
      type: appData.type,
      userId: existingSetupEntry.userId,
      appId: appData.appId,
    },
  });

  if (credential) {
    await prisma.credential.update({
      where: {
        id: credential.id,
      },
      data: {
        key: zoomKey,
      },
    });
  }

  return {
    message: "Managed setup updated",
  };
}

export default defaultResponder(patchHandler);
