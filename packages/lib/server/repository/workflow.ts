import { z } from "zod";

import prisma from "@calcom/prisma";
import type { TGetVerifiedEmailsInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedEmails.schema";
import type { TGetVerifiedNumbersInputSchema } from "@calcom/trpc/server/routers/viewer/workflows/getVerifiedNumbers.schema";

export const ZGetInputSchema = z.object({
  id: z.number(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;

export class WorkflowRepository {
  static async getById({ id }: TGetInputSchema) {
    return await prisma.workflow.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        teamId: true,
        isActiveOnAll: true,
        team: {
          select: {
            id: true,
            slug: true,
            members: true,
            name: true,
            isOrganization: true,
          },
        },
        time: true,
        timeUnit: true,
        activeOn: {
          select: {
            eventType: true,
          },
        },
        activeOnTeams: {
          select: {
            team: true,
          },
        },
        trigger: true,
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });
  }

  static async getVerifiedNumbers({
    userId,
    teamId,
  }: TGetVerifiedNumbersInputSchema & { userId: number | null }) {
    if (!userId) {
      throw new Error("User Id not found");
    }
    const verifiedNumbers = await prisma.verifiedNumber.findMany({
      where: {
        OR: [{ userId }, { teamId }],
      },
    });

    return verifiedNumbers;
  }

  static async getVerifiedEmails({
    userEmail,
    userId,
    teamId,
  }: TGetVerifiedEmailsInputSchema & { userEmail: string | null; userId: number | null }) {
    if (!userId) {
      throw new Error("User Id not found");
    }
    if (!userEmail) {
      throw new Error("User email not found");
    }

    let verifiedEmails: string[] = [userEmail];

    if (teamId) {
      const team = await prisma.team.findFirst({
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
                },
              },
            },
          },
        },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      const isTeamMember = team.members.some((member) => member.userId === userId);

      if (!isTeamMember) {
        throw new Error("You are not a member of this team");
      }

      verifiedEmails = verifiedEmails.concat(team.members.map((member) => member.user.email));
    }

    const emails = (
      await prisma.verifiedEmail.findMany({
        where: {
          OR: [{ userId }, { teamId }],
        },
      })
    ).map((verifiedEmail) => verifiedEmail.email);

    verifiedEmails = verifiedEmails.concat(emails);

    return verifiedEmails;
  }
}
