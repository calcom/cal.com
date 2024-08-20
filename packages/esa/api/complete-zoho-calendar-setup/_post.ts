/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

async function postHandler(req: NextApiRequest & { prisma: any; userId: number }) {
  const prisma: PrismaClient = req.prisma;
  const userId = req.userId;

  await prisma.zohoSchedulingSetup.update({
    where: {
      userId,
    },
    data: {
      status: "Completed",
      completeSetupToken: null,
    },
  });

  return {};
}

export default defaultResponder(postHandler);
