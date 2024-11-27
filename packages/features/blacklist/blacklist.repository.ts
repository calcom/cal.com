import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";
import { BlacklistType } from "@calcom/prisma/enums";

import type { IBlacklistRepository } from "./blacklist.repository.interface";

export class BlacklistRepository implements IBlacklistRepository {
  async getEmailInBlacklist(email: string) {
    try {
      const emailInBlacklist = await db.blacklist.findFirst({
        where: {
          type: BlacklistType.EMAIL,
          value: email,
        },
      });
      return emailInBlacklist;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
