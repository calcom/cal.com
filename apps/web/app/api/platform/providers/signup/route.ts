import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { emailRegex } from "@calcom/lib/emailSchema";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import slugify from "@calcom/lib/slugify";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/lib/validateUsername";
import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

export const mentorSignupSchema = z.object({
  username: z.string().optional(),
  email: z.string().regex(emailRegex, { message: "Invalid email" }),
  name: z.string(),
  sessionLength: z.number().min(15).max(240).optional().default(60),
  // No password, no other user types - just mentors
});

export default async function handler(req: NextRequest) {
  let body = {};
  try {
    body = await parseRequestData(req);
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.statusCode });
    }
    logger.error(e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
  const mentorData = mentorSignupSchema.parse(body);

  const username = slugify(mentorData.username || mentorData.email.split("@")[0]);
  const userEmail = mentorData.email.toLowerCase();

  if (!username) {
    return NextResponse.json({ message: "Invalid username" }, { status: 422 });
  }

  return handleMentorSignup({
    username,
    userEmail,
    sessionLength: mentorData.sessionLength,
  });
}

async function handleMentorSignup({
  username,
  userEmail,
  sessionLength,
  name,
}: {
  username: string;
  userEmail: string;
  sessionLength: number;
  name?: string;
}) {
  // Validate username availability
  const userValidation = await validateAndGetCorrectedUsernameAndEmail({
    username,
    email: userEmail,
    isSignup: true,
  });

  if (!userValidation.isValid) {
    return NextResponse.json({ message: "Username or email is already taken" }, { status: 409 });
  }

  const correctedUsername = userValidation.username;

  // Create mentor user in Cal.com
  const mentor = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      username: correctedUsername,
      emailVerified: new Date(Date.now()), // Auto-verify mentors
      identityProvider: IdentityProvider.CAL,
    },
    create: {
      username: correctedUsername,
      email: userEmail,
      name: name || correctedUsername,
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
      // No password - mentors access via your platform
    },
  });

  // Create default mentoring event type
  const eventType = await prisma.eventType.create({
    data: {
      userId: mentor.id,
      title: "Mentoring Session",
      slug: "mentoring",
      length: sessionLength,
      description: "One-on-one mentoring session",
    },
  });

  return NextResponse.json(
    {
      message: "Mentor created successfully",
      mentor: {
        id: mentor.id,
        email: mentor.email,
        username: mentor.username,
      },
      eventType: {
        id: eventType.id,
        slug: eventType.slug,
      },
    },
    { status: 201 }
  );
}

export const POST = defaultResponderForAppDir(handler);
