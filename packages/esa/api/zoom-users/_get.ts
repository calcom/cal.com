/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";
import { VideoApiAdapter } from "@calcom/zoomvideo/lib";

type ZoomUser = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  status: string;
};

async function getHandler(req: NextApiRequest) {
  const $req = req as NextApiRequest & { prisma: any };
  const adapter = VideoApiAdapter({ key: { user_id: true } } as any);
  const response = await (adapter as any).getZoomUsers();

  const prisma: PrismaClient = $req.prisma;
  const schedulingSetupEntries = await prisma.zohoSchedulingSetup.findMany();
  const linkedZoomAccounts = schedulingSetupEntries.map((entry) => entry.zoomUserId);

  const notYetLinkedZoomUsers = (response.users as ZoomUser[])
    .filter((user) => {
      return !linkedZoomAccounts.includes(user.id);
    })
    .map((user) => {
      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      };
    });

  return {
    zoomUsers: notYetLinkedZoomUsers,
  };
}

export default defaultResponder(getHandler);
