import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const prisma = (await import("@calcom/prisma")).default;
  const session = await getServerSession({ req });
  // if (!session) return res.status(409).json({ message: "Unauthorized" });
  const user = await prisma.user.findUnique({ where: { id: 60 } });
  if (!user) return res.status(404).json({ message: "No user found" });

  trpc;

  const host = req.query.host === "true";

  return res.status(200).json({
    status: "success",
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      timeFormat: user.timeFormat,
      defaultScheduleId: user.defaultScheduleId,
      weekStart: user.weekStart,
      timeZone: user.timeZone,
      organizationId: organization && organization.id,
      organization: organization && {
        isPlatform: organization.isPlatform,
        id: organization.id,
      },
    },
  });
}
