import { IdentityProvider } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { isPasswordValid } from "@calcom/lib/auth";

import { hashPassword } from "@lib/auth";
import prisma from "@lib/prisma";
import slugify from "@lib/slugify";

const querySchema = z.object({
  username: z.string().min(1),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().refine((val) => isPasswordValid(val.trim()), {
    message:
      "The password must be a minimum of 7 characters long containing at least one number and have a mixture of uppercase and lowercase letters",
  }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return;
  }

  const userCount = await prisma.user.count();
  if (userCount !== 0) {
    res.status(400).json({ message: "No setup needed." });
  }

  const parsedQuery = querySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(422).json({ message: parsedQuery.error.message });
    return;
  }

  const username = slugify(parsedQuery.data.username);
  const userEmail = parsedQuery.data.email.toLowerCase();

  const hashedPassword = await hashPassword(parsedQuery.data.password);

  await prisma.user.create({
    data: {
      username,
      email: userEmail,
      password: hashedPassword,
      role: "ADMIN",
      identityProvider: IdentityProvider.CAL,
    },
  });

  res.status(201).json({ message: "First admin user created successfuly." });
}
