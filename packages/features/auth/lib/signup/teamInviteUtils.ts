import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { IdentityProvider } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export async function checkIfTokenExistsAndValid(token: string) {
  const foundToken = await prisma.verificationToken.findFirst({
    where: {
      token,
    },
    select: {
      id: true,
      expires: true,
      teamId: true,
    },
  });
  if (!foundToken) {
    throw new HttpError({
      statusCode: 401,
      message: "Invalid Token",
    });
  }

  if (dayjs(foundToken?.expires).isBefore(dayjs())) {
    throw new HttpError({
      statusCode: 401,
      message: "Token expired",
    });
  }

  return foundToken;
}

export async function findTeam(teamId: number) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  if (!team) {
    throw new HttpError({
      statusCode: 404,
      message: "Team not found",
    });
  }

  return {
    ...team,
    metadata: teamMetadataSchema.parse(team.metadata),
  };
}

export async function upsertUsersPasswordAndVerify(email: string, username: string, hashedPassword: string) {
  return await prisma.user.upsert({
    where: { email },
    update: {
      username,
      password: hashedPassword,
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
    },
    create: {
      username,
      email: email,
      password: hashedPassword,
      identityProvider: IdentityProvider.CAL,
    },
  });
}

export async function acceptAllInvitesWithTeamId(userId: number, teamId: number) {
  const membership = await prisma.membership.update({
    where: {
      userId_teamId: { userId: userId, teamId: teamId },
    },
    data: {
      accepted: true,
    },
  });

  return membership;
}

export async function joinOrgAndAcceptChildInvites(userId: number, orgId: number) {
  // Join ORG
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      organizationId: orgId,
    },
  });

  /** We do a membership update twice so we can join the ORG invite if the user is invited to a team witin a ORG. */
  await prisma.membership.updateMany({
    where: {
      userId: userId,
      team: {
        id: orgId,
      },
      accepted: false,
    },
    data: {
      accepted: true,
    },
  });

  // Join any other invites
  await prisma.membership.updateMany({
    where: {
      userId: userId,
      team: {
        parentId: orgId,
      },
      accepted: false,
    },
    data: {
      accepted: true,
    },
  });
}

export async function cleanUpInviteToken(tokenId: number) {
  await prisma.verificationToken.delete({
    where: {
      id: tokenId,
    },
  });
}
