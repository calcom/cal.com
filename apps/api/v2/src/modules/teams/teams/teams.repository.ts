import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable, NotFoundException } from "@nestjs/common";

import { teamMetadataSchema } from "@calcom/platform-libraries";
import { Prisma } from "@calcom/prisma/client";

@Injectable()
export class TeamsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async create(team: Prisma.TeamCreateInput) {
    return this.dbWrite.prisma.team.create({
      data: team,
    });
  }

  async getById(teamId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: { id: teamId },
    });
  }

  async getByIds(teamIds: number[]) {
    return this.dbRead.prisma.team.findMany({
      where: {
        id: {
          in: teamIds,
        },
      },
    });
  }

  async getTeamMembersIds(teamId: number) {
    const team = await this.dbRead.prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        members: true,
      },
    });
    if (!team) {
      return [];
    }

    return team.members.map((member) => member.userId);
  }

  async getTeamsUserIsMemberOf(userId: number) {
    return this.dbRead.prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
    });
  }

  async update(teamId: number, team: Prisma.TeamUpdateInput) {
    return this.dbWrite.prisma.team.update({
      where: { id: teamId },
      data: team,
    });
  }

  async delete(teamId: number) {
    return this.dbWrite.prisma.team.delete({
      where: { id: teamId },
    });
  }

  async setDefaultConferencingApp(teamId: number, appSlug?: string, appLink?: string) {
    const team = await this.getById(teamId);
    const teamMetadata = teamMetadataSchema.parse(team?.metadata);

    if (!team) {
      throw new NotFoundException("user not found");
    }

    return await this.dbWrite.prisma.team.update({
      data: {
        metadata:
          typeof teamMetadata === "object"
            ? {
                ...teamMetadata,
                defaultConferencingApp: {
                  appSlug: appSlug,
                  appLink: appLink,
                },
              }
            : {},
      },

      where: { id: teamId },
    });
  }
}
