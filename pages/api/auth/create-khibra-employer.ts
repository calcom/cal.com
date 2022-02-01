import { NextApiRequest, NextApiResponse } from "next";

import { hashPassword } from "@lib/auth";
import prisma from "@lib/prisma";
import slugify from "@lib/slugify";

import { IdentityProvider } from ".prisma/client";

const getKhibraEmployerEmail = (id: number) => `khibra_employer_${id}@getkhibra.com`;
const khibraPassword = process.env.KHIBRA_EMPLOYER_PASSWORD || "123456";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return;
  }

  const { employerId, employerName } = req.body;

  const username = slugify(employerName);
  const email = getKhibraEmployerEmail(employerId);
  const hashedPassword = await hashPassword(khibraPassword);

  const existingUser = await prisma.user.findFirst({ where: { email } });

  if (existingUser) {
    return res.status(422).json({ message: "khibra_employer_reg_duplicate" });
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
      completedOnboarding: true,
      locale: "en",
      plan: "PRO",
    },
  });

  await prisma.eventType.create({
    data: {
      userId: user.id,
      users: { connect: { id: user.id } },
      title: "Default title",
      slug: "default-book",
      length: 60,
    },
  });

  res.status(201).json({
    calUserId: user.id,
  });
}
