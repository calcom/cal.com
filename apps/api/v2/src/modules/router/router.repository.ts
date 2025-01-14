import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class RoutingRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findFormByIdIncludeUserTeamAndOrg(formId: string) {
    return await this.dbRead.prisma.app_RoutingForms_Form.findUnique({
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
