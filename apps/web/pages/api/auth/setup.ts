import { IdentityProvider } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { isPasswordValid } from "@calcom/lib/auth";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { hashPassword } from "@lib/auth";
import prisma from "@lib/prisma";
import slugify from "@lib/slugify";

const querySchema = z.object({
  username: z.string().min(1),
  fullname: z.string(),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().refine((val) => isPasswordValid(val.trim()), {
    message:
      "The password must be a minimum of 7 characters long containing at least one number and have a mixture of uppercase and lowercase letters",
  }),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userCount = await prisma.user.count();
  if (userCount !== 0) {
    throw new HttpError({ statusCode: 400, message: "No setup needed." });
  }

  const parsedQuery = querySchema.safeParse(req.body);
  if (!parsedQuery.success) {
    throw new HttpError({ statusCode: 422, message: parsedQuery.error.message });
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
      name: parsedQuery.data.fullname,
      emailVerified: new Date(),
      locale: "en", // TODO: We should revisit this
      plan: "PRO",
      identityProvider: IdentityProvider.CAL,
    },
  });

  res.status(201).json({ message: "First admin user created successfuly." });
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
