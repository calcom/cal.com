import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { isPasswordValid } from "@calcom/features/auth/lib/isPasswordValid";
import { emailRegex } from "@calcom/lib/emailSchema";
import { HttpError } from "@calcom/lib/http-error";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { CreationSource } from "@calcom/prisma/enums";

const querySchema = z.object({
  username: z
    .string()
    .refine((val) => val.trim().length >= 1, { message: "Please enter at least one character" }),
  full_name: z.string().min(3, "Please enter at least 3 characters"),
  email_address: z.string().regex(emailRegex, { message: "Please enter a valid email" }),
  password: z.string().refine((val) => isPasswordValid(val.trim(), false, true), {
    message:
      "The password must be a minimum of 15 characters long containing at least one number and have a mixture of uppercase and lowercase letters",
  }),
});

async function handler(req: NextRequest) {
  const userCount = await prisma.user.count();
  if (userCount !== 0) {
    throw new HttpError({ statusCode: 400, message: "No setup needed." });
  }

  const parsedQuery = querySchema.safeParse(await req.json());
  if (!parsedQuery.success) {
    throw new HttpError({ statusCode: 422, message: parsedQuery.error.message });
  }

  const username = slugify(parsedQuery.data.username.trim());
  const userEmail = parsedQuery.data.email_address.toLowerCase();

  const hashedPassword = await hashPassword(parsedQuery.data.password);

  await prisma.user.create({
    data: {
      username,
      email: userEmail,
      password: { create: { hash: hashedPassword } },
      role: "ADMIN",
      name: parsedQuery.data.full_name,
      emailVerified: new Date(),
      locale: "en", // TODO: We should revisit this
      identityProvider: IdentityProvider.CAL,
      creationSource: CreationSource.WEBAPP,
    },
  });

  return NextResponse.json({ message: "First admin user created successfully." });
}

const postHandler = defaultResponderForAppDir(handler);

export { postHandler as POST };
