import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

const defaultSelect = {
  id: true,
  description: true,
  position: true,
  routes: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  fields: true,
  updatedById: true,
  userId: true,
  teamId: true,
  disabled: true,
  settings: true,
};

export class RoutingFormRepository {
  static async findById<T extends Partial<typeof defaultSelect> = typeof defaultSelect>(
    id: string,
    options?: { select?: T }
  ): Promise<Prisma.App_RoutingForms_FormGetPayload<{ select: T }> | null> {
    return await prisma.app_RoutingForms_Form.findUnique({
      where: { id },
      select: options?.select ?? (defaultSelect as T),
    });
  }

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
}
