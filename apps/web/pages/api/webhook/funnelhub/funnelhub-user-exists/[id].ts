/* eslint-disable turbo/no-undeclared-env-vars */
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import prisma from "@calcom/prisma";

export const FunnelhubUserExistsSchema = z.object({
  funnelHubUserId: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const funnelHubToken = process.env.FUNNELHUB_API_TOKEN;
  const funnelHubApiToken = req.headers["funnehub-calendar-token"];
  const isFunnelHubOrigin = funnelHubToken === funnelHubApiToken;

  if (req.method.toLowerCase() !== "get") return res.status(404).json({ message: "method not allowed" });

  if (!isFunnelHubOrigin) return res.status(401).json({ message: "Invalid funnelhub api token " });

  const userValidation = FunnelhubUserExistsSchema.safeParse({ funnelHubUserId: req.url?.split("/").pop() });

  if (!userValidation.success)
    return res.status(422).json({ errors: userValidation.error.flatten().fieldErrors });

  const { funnelHubUserId } = userValidation.data;
  const user = await prisma.user.findFirst({ where: { funnelHubUserId } });

  return res.status(200).json({ exists: !!user });
}
