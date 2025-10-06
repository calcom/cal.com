import type { PrismaClient } from "@calcom/prisma";

import { BaseRepository } from "./base.repository";

export interface SecondaryEmailRecord {
  id: number;
  userId: number;
  email: string;
  emailVerified: Date | null;
}

export class SecondaryEmailRepository extends BaseRepository<SecondaryEmailRecord> {
  constructor(prisma: PrismaClient) {
    // @ts-expect-error BaseRepository generic id constraint; model has id
    super(prisma);
  }

  async deleteManyByIdsForUser(ids: number[], userId: number) {
    try {
      await this.prisma.secondaryEmail.deleteMany({ where: { id: { in: ids }, userId } });
    } catch (error) {
      this.handleDatabaseError(error, "delete many secondary emails");
    }
  }

  async findManyByIdsForUser(ids: number[], userId: number) {
    try {
      return await this.prisma.secondaryEmail.findMany({ where: { id: { in: ids }, userId } });
    } catch (error) {
      this.handleDatabaseError(error, "find many secondary emails by ids");
    }
  }

  async update(id: number, userId: number, data: { email: string; emailVerified: Date | null }) {
    try {
      return await this.prisma.secondaryEmail.update({ where: { id, userId }, data });
    } catch (error) {
      this.handleDatabaseError(error, "update secondary email");
    }
  }

  async findUniqueByEmailAndUser(email: string, userId: number) {
    try {
      return await this.prisma.secondaryEmail.findUnique({
        where: { email, userId },
        select: { id: true, emailVerified: true },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find secondary email by email and user");
    }
  }
}
