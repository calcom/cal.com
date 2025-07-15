import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";

import type { IUsersRepository } from "./usersRepositoryInterface";

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
}
