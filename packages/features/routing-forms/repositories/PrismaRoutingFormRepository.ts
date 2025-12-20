import { prisma } from "@calcom/prisma";

import type {
  RoutingFormSelect,
  SelectedFields,
  FindByIdOptions,
  RoutingFormWithUserTeamAndOrg,
} from "./PrismaRoutingFormRepositoryInterface";

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
} as const;

export class PrismaRoutingFormRepository {
  static async findById<T extends RoutingFormSelect | undefined = undefined>(
    id: string,
    options?: FindByIdOptions<T>
  ): Promise<SelectedFields<T> | null> {
    const select = options?.select ?? defaultSelect;
    return (await prisma.app_RoutingForms_Form.findUnique({
      where: { id },
      select,
    })) as SelectedFields<T> | null;
  }

  static async findActiveFormsForUserOrTeam({ userId, teamId }: { userId?: number; teamId?: number }) {
    if (!userId && !teamId) return [];

    const routingFormQuery = {
      select: {
        id: true,
        name: true,
      },
      orderBy: [
        {
          name: "asc" as const,
        },
      ],
    };

    if (teamId) {
      return await prisma.app_RoutingForms_Form.findMany({
        where: {
          teamId: teamId,
          disabled: false,
          team: {
            members: {
              some: {
                userId: userId,
                accepted: true,
              },
            },
          },
        },
        ...routingFormQuery,
      });
    }

    return await prisma.app_RoutingForms_Form.findMany({
      where: {
        userId: userId,
        teamId: null, // Only personal forms, not team forms
        disabled: false,
      },
      ...routingFormQuery,
    });
  }

  static async findFormByIdIncludeUserTeamAndOrg(
    formId: string
  ): Promise<RoutingFormWithUserTeamAndOrg | null> {
    return (await prisma.app_RoutingForms_Form.findUnique({
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
            timeFormat: true,
            locale: true,
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
    })) as RoutingFormWithUserTeamAndOrg | null;
  }
}
