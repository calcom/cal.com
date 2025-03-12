import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { IS_STRIPE_ENABLED } from "@calcom/lib/constants";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";
import { CreationSource } from "@calcom/prisma/enums";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

const verifySchema = z.object({
  token: z.string(),
});

const USER_ALREADY_EXISTING_MESSAGE = "A User already exists with this email";

export async function moveUserToMatchingOrg({ email }: { email: string }) {
  const org = await OrganizationRepository.findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({ email });

  if (!org) {
    return;
  }

  await inviteMembersWithNoInviterPermissionCheck({
    inviterName: null,
    teamId: org.id,
    language: "en",
    creationSource: CreationSource.WEBAPP,
    invitations: [
      {
        usernameOrEmail: email,
        role: MembershipRole.MEMBER,
      },
    ],
    orgSlug: org.slug || org.requestedSlug,
  });
}

async function handler(req: NextRequest) {
  const { token } = verifySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const foundToken = await prisma.verificationToken.findFirst({
    where: {
      token,
    },
  });

  if (!foundToken) {
    return NextResponse.json({ message: "No token found" }, { status: 401 });
  }

  if (dayjs(foundToken?.expires).isBefore(dayjs())) {
    return NextResponse.json({ message: "Token expired" }, { status: 401 });
  }

  // The user is verifying the secondary email
  if (foundToken?.secondaryEmailId) {
    await prisma.secondaryEmail.update({
      where: {
        id: foundToken.secondaryEmailId,
        email: foundToken?.identifier,
      },
      data: {
        emailVerified: new Date(),
      },
    });

    await cleanUpVerificationTokens(foundToken.id);

    return NextResponse.redirect(`${WEBAPP_URL}/settings/my-account/profile`);
  }

  const user = await prisma.user.findFirst({
    where: {
      email: foundToken?.identifier,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Cannot find a user attached to this token" }, { status: 401 });
  }

  const userMetadataParsed = userMetadata.parse(user.metadata);
  // Attach the new email and verify
  if (userMetadataParsed?.emailChangeWaitingForVerification) {
    // Ensure this email isn't in use
    const existingUser = await prisma.user.findUnique({
      where: { email: userMetadataParsed?.emailChangeWaitingForVerification },
      select: {
        id: true,
      },
    });
    if (existingUser) {
      return NextResponse.json({ message: USER_ALREADY_EXISTING_MESSAGE }, { status: 401 });
    }

    // Ensure this email isn't being added by another user as secondary email
    const existingSecondaryUser = await prisma.secondaryEmail.findUnique({
      where: {
        email: userMetadataParsed?.emailChangeWaitingForVerification,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (existingSecondaryUser && existingSecondaryUser.userId !== user.id) {
      return NextResponse.json({ message: USER_ALREADY_EXISTING_MESSAGE }, { status: 401 });
    }

    const oldEmail = user.email;
    const updatedEmail = userMetadataParsed.emailChangeWaitingForVerification;
    delete userMetadataParsed.emailChangeWaitingForVerification;

    // Update and re-verify
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        email: updatedEmail,
        metadata: userMetadataParsed,
      },
    });

    if (IS_STRIPE_ENABLED && userMetadataParsed.stripeCustomerId) {
      await stripe.customers.update(userMetadataParsed.stripeCustomerId, {
        email: updatedEmail,
      });
    }

    // The user is trying to update the email to an already existing unverified secondary email of his
    // so we swap the emails and its verified status
    if (existingSecondaryUser?.userId === user.id) {
      await prisma.secondaryEmail.update({
        where: {
          id: existingSecondaryUser.id,
          userId: user.id,
        },
        data: {
          email: oldEmail,
          emailVerified: user.emailVerified,
        },
      });
    }

    await cleanUpVerificationTokens(foundToken.id);

    return NextResponse.json(
      {
        updatedEmail,
      },
      { status: 200 }
    );
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      emailVerified: new Date(),
    },
  });

  const hasCompletedOnboarding = user.completedOnboarding;

  await moveUserToMatchingOrg({ email: user.email });

  return NextResponse.redirect(
    `${WEBAPP_URL}/${hasCompletedOnboarding ? "/event-types" : "/getting-started"}`
  );
}

export async function cleanUpVerificationTokens(id: number) {
  // Delete token from DB after it has been used
  await prisma.verificationToken.delete({
    where: {
      id,
    },
  });
}

export const GET = defaultResponderForAppDir(handler);
