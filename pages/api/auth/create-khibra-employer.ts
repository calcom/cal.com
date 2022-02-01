import { NextApiRequest, NextApiResponse } from "next";

import { hashPassword } from "@lib/auth";
import prisma from "@lib/prisma";

import { IdentityProvider } from ".prisma/client";

const getKhibraEmployerEmail = (id: number) => `khibra_employer_${id}@getkhibra.com`;
const khibraPassword = process.env.KHIBRA_EMPLOYER_PASSWORD || "123456";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return;
  }

  const { employerId, employerName: username } = req.body;

  const email = getKhibraEmployerEmail(employerId);
  const hashedPassword = await hashPassword(khibraPassword);

  const result = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      password: hashedPassword,
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
    },
    create: {
      username,
      email,
      password: hashedPassword,
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
    },
  });

  res.status(201).json({
    calUserId: result.id,
  });
}
