import prisma from "@calcom/prisma";

export class RoutingFormRepository {
  static async findFormByIdIncludeUserTeamAndOrg(formId: string) {
    return await prisma.app_RoutingForms_Form.findUnique({
      where: {
        id: formId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        disabled: true,
        fields: true,
        routes: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        teamId: true,
        position: true,
        settings: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            movedToProfileId: true,
            metadata: true,
            theme: true,
            brandColor: true,
            darkBrandColor: true,
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
}
