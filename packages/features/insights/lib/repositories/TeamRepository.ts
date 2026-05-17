import type { PrismaClient } from "@calcom/prisma";

export class TeamRepository {
  constructor(private prisma: PrismaClient) {}

  async findAllByParentId({ parentId, select }: { parentId: number; select: { id: true } }) {
    return this.prisma.team.findMany({
      where: { parentId },
      select,
    });
  }

  async findByIdAndParentId({
    id,
    parentId,
    select,
  }: {
    id: number;
    parentId: number;
    select: { id: true };
  }) {
    return this.prisma.team.findFirst({
      where: { id, parentId },
      select,
    });
  }

  async findById({ id }: { id: number }) {
    return this.prisma.team.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    });
  }
}
