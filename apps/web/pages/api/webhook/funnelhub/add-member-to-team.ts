/* eslint-disable turbo/no-undeclared-env-vars */
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import prisma from "@calcom/prisma";

export const AddMemberToTeamSchema = z.object({
  funnelHubUserId: z.string(),
  workspaceId: z.string(),
  role: z.enum(["MEMBER", "ADMIN", "OWNER"]).default("MEMBER"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const funnelHubToken = process.env.FUNNELHUB_API_TOKEN;
  const funnelHubApiToken = req.headers["funnehub-calendar-token"];
  const isFunnelHubOrigin = funnelHubToken === funnelHubApiToken;

  if (req.method.toLowerCase() !== "post") return res.status(404).json({ message: "method not allowed" });

  if (!isFunnelHubOrigin) return res.status(401).json({ message: "Invalid funnelhub api token " });

  const userValidation = AddMemberToTeamSchema.safeParse(req.body);

  if (!userValidation.success)
    return res.status(422).json({ errors: userValidation.error.flatten().fieldErrors });

  const { funnelHubUserId, workspaceId, role } = userValidation.data;
  const user = await prisma.user.findFirst({ where: { funnelHubUserId } });
  if (!user) res.status(404).json({ errors: ["User not found"] });
  const team = await prisma.team.findFirst({ where: { funnelhubWorkspaceId: workspaceId } });
  if (!team) res.status(404).json({ errors: ["Team not found"] });

  const memberShip = await prisma.membership.findFirst({
    where: {
      userId: user?.id as number,
      teamId: team?.id as number,
    },
  });

  if (!memberShip) {
    await prisma.membership.create({
      data: {
        userId: user?.id as number,
        teamId: team?.id as number,
        role,
      },
    });
  } else {
    await prisma.membership.update({
      where: {
        id: memberShip.id,
      },
      data: {
        userId: user?.id as number,
        teamId: team?.id as number,
        role,
      },
    });
  }

  return res.status(200).json({ message: "User created successfully!" });
}
