/* eslint-disable turbo/no-undeclared-env-vars */
import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";

export const FunnelhubSignupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  funnelHubUserId: z.string(),
  workspaceId: z.string().optional(),
  shouldNotCreateTeam: z.boolean().default(false),
});

const generateRandomString = (length: number) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const funnelHubToken = process.env.FUNNELHUB_API_TOKEN;
  const funnelHubApiToken = req.headers["funnehub-calendar-token"];
  const isFunnelHubOrigin = funnelHubToken === funnelHubApiToken;
  if (req.method.toLowerCase() !== "post") return res.status(404).json({ message: "method not allowed" });

  if (!isFunnelHubOrigin) return res.status(401).json({ message: "Invalid funnelhub api token " });

  const userValidation = FunnelhubSignupSchema.safeParse(req.body);

  if (!userValidation.success)
    return res.status(422).json({ errors: userValidation.error.flatten().fieldErrors });

  const { email, name, funnelHubUserId, workspaceId, shouldNotCreateTeam } = userValidation.data;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      funnelHubUserId,
      emailVerified: new Date(),
      timeZone: "America/Sao_Paulo",
      locale: "pt-BR",
      username: `${name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")}-${generateRandomString(5)}`,
    },
  });

  if (shouldNotCreateTeam) {
    return res.status(200).json({ message: "User created successfully!" });
  }

  const userTeam = await prisma.team.create({
    data: {
      name: `${name} time`,
      slug: `${name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")}-time-${generateRandomString(5)}`,
      funnelhubWorkspaceId: workspaceId,
      timeZone: "America/Sao_Paulo",
    },
  });

  await prisma.membership.create({
    data: {
      teamId: userTeam.id,
      userId: user.id,
      role: MembershipRole.OWNER,
      accepted: true,
    },
  });

  return res.status(200).json({ message: "User created successfully!" });
}
