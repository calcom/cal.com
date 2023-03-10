import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { performance } from "@calcom/lib/server/perfObserver";

let isCold = true;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const prePrismaDate = performance.now();
  const prisma = (await import("@calcom/prisma")).default;
  const preSessionDate = performance.now();
  const session = await getServerSession({ req, res });
  if (!session) return res.status(409).json({ message: "Unauthorized" });
  const preUserDate = performance.now();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return res.status(404).json({ message: "No user found" });
  const lastUpdate = performance.now();

  res.setHeader("x-is-cold", isCold.toString());
  isCold = false;

  return res.status(200).json({
    message: `Hello ${user.name}`,
    prePrismaDate,
    prismaDuration: `Prisma took ${preSessionDate - prePrismaDate}ms`,
    preSessionDate,
    sessionDuration: `Session took ${preUserDate - preSessionDate}ms`,
    preUserDate,
    userDuration: `User took ${lastUpdate - preUserDate}ms`,
    lastUpdate,
    wasCold: isCold,
  });
}
