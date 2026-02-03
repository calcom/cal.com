import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { prisma } from "@calcom/prisma";

export const verifyEmailSender = async (email: string, userId: number, teamId: number | null) => {
  const verifiedEmail = await prisma.verifiedEmail.findFirst({
    where: {
      email,
      OR: [{ userId }, { teamId }],
    },
  });

  if (verifiedEmail) {
    if (teamId) {
      if (!verifiedEmail.teamId) {
        await prisma.verifiedEmail.update({
          where: {
            id: verifiedEmail.id,
          },
          data: {
            teamId,
          },
        });
      } else if (verifiedEmail.teamId !== teamId) {
        await prisma.verifiedEmail.create({
          data: {
            email,
            userId,
            teamId,
          },
        });
      }
    }
    return;
  }

  const userEmail = await prisma.user.findFirst({
    where: {
      id: userId,
      email,
    },
  });

  if (userEmail) {
    await prisma.verifiedEmail.create({
      data: {
        email,
        userId,
        teamId,
      },
    });
    return;
  }

  // Check if it's a verified secondary email of the user
  const secondaryEmail = await prisma.secondaryEmail.findFirst({
    where: {
      userId,
      email,
      emailVerified: {
        not: null,
      },
    },
  });

  if (secondaryEmail) {
    await prisma.verifiedEmail.create({
      data: {
        email,
        userId,
        teamId,
      },
    });
    return;
  }

  if (teamId) {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                secondaryEmails: {
                  select: {
                    email: true,
                    emailVerified: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Team not found");
    }

    const isTeamMember = team.members.some((member) => member.userId === userId);

    if (!isTeamMember) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "You are not a member of this team");
    }

    let foundTeamMember = team.members.find((member) => member.user.email === email);

    // Only check secondary emails if no match was found with primary email
    if (!foundTeamMember) {
      foundTeamMember = team.members.find((member) =>
        member.user.secondaryEmails.some(
          (secondary) => secondary.email === email && !!secondary.emailVerified
        )
      );
    }

    if (foundTeamMember) {
      await prisma.verifiedEmail.create({
        data: {
          email,
          userId,
          teamId,
        },
      });
      return;
    }
  }

  throw new ErrorWithCode(ErrorCode.NotFound, "Email not verified");
};
