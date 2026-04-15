import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaTeamRepository {
  constructor(
    private readonly dbWrite: PrismaWriteService,
    private readonly dbRead: PrismaReadService
  ) {}

  async findTeamById(teamId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: { id: teamId },
    });
  }

  async findTeamsByIds(teamIds: number[]) {
    return this.dbRead.prisma.team.findMany({
      where: { id: { in: teamIds } },
    });
  }

  async getTeamByIdIfUserIsAdmin(args: { userId: number; teamId: number }) {
    return this.dbRead.prisma.team.findFirst({
      where: {
        id: args.teamId,
        members: {
          some: {
            userId: args.userId,
            role: { in: ["ADMIN", "OWNER"] },
          },
        },
      },
    });
  }
}
