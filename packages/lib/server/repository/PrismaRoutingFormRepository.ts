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
