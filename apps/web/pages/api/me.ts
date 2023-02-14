import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

let isCold = true;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const prePrismaDate = new Date();
  const prisma = (await import("@calcom/prisma")).default;
  const preSessionDate = new Date();
  const session = await getSession({ req });
  if (!session) return res.status(409).json({ message: "Unauthorized" });
  const preUserDate = new Date();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return res.status(404).json({ message: "No user found" });
  const lastUpdate = new Date();

  res.setHeader("x-is-cold", isCold.toString());
  isCold = false;

  return res.status(200).json({
    message: `Hello ${user.name}`,
    prePrismaDate,
    prismaDuration: `Prisma took ${preSessionDate.getMilliseconds() - prePrismaDate.getMilliseconds()}ms`,
    preSessionDate,
    sessionDuration: `Session took ${preUserDate.getMilliseconds() - preSessionDate.getMilliseconds()}ms`,
    preUserDate,
    userDuration: `User took ${lastUpdate.getMilliseconds() - preUserDate.getMilliseconds()}ms`,
    lastUpdate,
  });
}
