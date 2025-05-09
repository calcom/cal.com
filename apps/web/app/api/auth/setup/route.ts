import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";

import { isPasswordValid } from "@calcom/features/auth/lib/isPasswordValid";
import { emailRegex } from "@calcom/lib/emailSchema";
import { HttpError } from "@calcom/lib/http-error";
import { UserCreationService } from "@calcom/lib/server/service/userCreationService";
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
  const body = await parseRequestData(req);

  const parsedQuery = querySchema.safeParse(body);
  if (!parsedQuery.success) {
    throw new HttpError({ statusCode: 422, message: parsedQuery.error.message });
  }

  const userEmail = parsedQuery.data.email_address.toLowerCase();

  await UserCreationService.createUser({
    data: {
      username: parsedQuery.data.username.trim(),
      email: userEmail,
      password: parsedQuery.data.password,
      role: "ADMIN",
      name: parsedQuery.data.full_name,
      emailVerified: new Date(),
      locale: "en", // TODO: We should revisit this
      identityProvider: IdentityProvider.CAL,
      creationSource: CreationSource.SELF_SERVE_ADMIN,
    },
  });

  return NextResponse.json({ message: "First admin user created successfully." });
}

export const POST = defaultResponderForAppDir(handler);
