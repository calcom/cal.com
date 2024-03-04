/* eslint-disable turbo/no-undeclared-env-vars */
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import prisma from "@calcom/prisma";

export const FunnelhubSignupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  funnelHubUserId: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const funnelHubToken = process.env.FUNNELHUB_API_TOKEN;
  const funnelHubApiToken = req.headers["funnehub-calendar-token"];
  const isFunnelHubOrigin = funnelHubToken === funnelHubApiToken;

  if (!isFunnelHubOrigin) return res.status(401).json({ message: "Invalid funnelhub api token " });

  const userValidation = FunnelhubSignupSchema.safeParse(req.body);

  if (!userValidation.success)
    return res.status(422).json({ errors: userValidation.error.flatten().fieldErrors });

  const { email, name, funnelHubUserId } = userValidation.data;
  await prisma.user.create({
    data: {
      name,
      email,
      funnelHubUserId,
      emailVerified: new Date(),
      timeZone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
  });

  return res.status(200).json({ message: "User created successfully!" });
}
