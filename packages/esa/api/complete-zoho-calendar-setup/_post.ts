/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

async function postHandler(req: NextApiRequest) {
  const $req = req as NextApiRequest & { prisma: any; setupId: number };
  const prisma: PrismaClient = $req.prisma;
  const setupId = $req.setupId;

  await prisma.zohoSchedulingSetup.update({
    where: {
      id: setupId,
    },
    data: {
      status: "Completed",
      completeSetupToken: null,
    },
  });

  return {};
}

export default defaultResponder(postHandler);
