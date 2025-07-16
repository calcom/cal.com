import prisma from "@calcom/prisma";

export class RoutingFormRepository {
  static async findFormByIdIncludeUserTeamAndOrg(formId: string) {
    return await prisma.app_RoutingForms_Form.findUnique({
      where: {
        id: formId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            movedToProfileId: true,
            metadata: true,
            organization: {
              select: {
                slug: true,
              },
            },
          },
        },
        team: {
          select: {
            parentId: true,
            parent: {
              select: {
                slug: true,
              },
            },
            slug: true,
            metadata: true,
          },
        },
      },
    });
  }

  static async findAllFormsByTeamIds(teamIds: number[]) {
    return await prisma.app_RoutingForms_Form.findMany({
      where: {
        teamId: { in: teamIds },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });
  }

  static async findAllPersonalFormsByUserId(userId: number) {
    return await prisma.app_RoutingForms_Form.findMany({
      where: {
        userId,
        teamId: null,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });
  }
}
