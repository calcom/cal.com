import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export class AgentRepository {
  static async findByIdWithUserAccess({ agentId, userId }: { agentId: string; userId: number }) {
    return await prisma.agent.findFirst({
      where: {
        id: agentId,
        OR: [
          { userId },
          {
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                },
              },
            },
          },
        ],
      },
    });
  }

  static async findByRetellAgentIdWithUserAccess({
    retellAgentId,
    userId,
  }: {
    retellAgentId: string;
    userId: number;
  }) {
    return await prisma.agent.findFirst({
      where: {
        retellAgentId,
        OR: [
          { userId },
          {
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                },
              },
            },
          },
        ],
      },
    });
  }

  static async findById({ id }: { id: string }) {
    return await prisma.agent.findUnique({
      where: {
        id,
      },
    });
  }

  static async findByRetellAgentId({ retellAgentId }: { retellAgentId: string }) {
    return await prisma.agent.findUnique({
      where: {
        retellAgentId,
      },
    });
  }

  static async findManyWithUserAccess({
    userId,
    teamId,
    scope = "all",
  }: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }) {
    const whereClause: any = {
      OR: [
        { userId },
        {
          team: {
            members: {
              some: {
                userId,
                accepted: true,
              },
            },
          },
        },
      ],
    };

    if (scope === "personal") {
      whereClause.OR = [{ userId }];
    } else if (scope === "team") {
      whereClause.OR = [
        {
          team: {
            members: {
              some: {
                userId,
                accepted: true,
              },
            },
          },
        },
      ];
    }

    if (teamId) {
      whereClause.teamId = teamId;
    }

    return await prisma.agent.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        outboundPhoneNumbers: {
          select: {
            id: true,
            phoneNumber: true,
            subscriptionStatus: true,
            provider: true,
          },
        },
      },
      orderBy: [{ teamId: "asc" }, { createdAt: "desc" }],
    });
  }

  static async findByIdWithUserAccessAndDetails({ id, userId }: { id: string; userId: number }) {
    return await prisma.agent.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                },
              },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        outboundPhoneNumbers: {
          select: {
            id: true,
            phoneNumber: true,
            subscriptionStatus: true,
            provider: true,
          },
        },
      },
    });
  }

  static async create({
    name,
    retellAgentId,
    userId,
    teamId,
  }: {
    name: string;
    retellAgentId: string;
    userId?: number;
    teamId?: number;
  }) {
    return await prisma.agent.create({
      data: {
        name,
        retellAgentId,
        userId: teamId ? undefined : userId,
        teamId: teamId || undefined,
      },
    });
  }

  static async findByIdWithAdminAccess({ id, userId }: { id: string; userId: number }) {
    return await prisma.agent.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                  role: {
                    in: [MembershipRole.ADMIN, MembershipRole.OWNER],
                  },
                },
              },
            },
          },
        ],
      },
    });
  }

  static async findByIdWithCallAccess({ id, userId }: { id: string; userId: number }) {
    return await prisma.agent.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                },
              },
            },
          },
        ],
      },
      include: {
        outboundPhoneNumbers: {
          select: {
            phoneNumber: true,
          },
        },
      },
    });
  }

  static async delete({ id }: { id: string }) {
    return await prisma.agent.delete({
      where: { id },
    });
  }

  static async linkToWorkflowStep({ workflowStepId, agentId }: { workflowStepId: number; agentId: string }) {
    return await prisma.workflowStep.update({
      where: { id: workflowStepId },
      data: { agentId },
    });
  }

  static async canManageTeamResources({
    userId,
    teamId,
  }: {
    userId: number;
    teamId: number;
  }): Promise<boolean> {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        accepted: true,
      },
    });

    if (!membership) {
      return false;
    }

    return membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER;
  }
}
