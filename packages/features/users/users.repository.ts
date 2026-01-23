import db, { prisma } from "@calcom/prisma";
import { captureException } from "@sentry/nextjs";
import type { IUsersRepository } from "./users.repository.interface";

export class UsersRepository implements IUsersRepository {
  async updateLastActiveAt(userId: number) {
    try {
      const user = await db.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });
      return user;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findUserTeams(userId: number): Promise<{ teams: { teamId: number }[] } | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          teams: {
            select: {
              teamId: true,
            },
          },
        },
      });
      return user;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
