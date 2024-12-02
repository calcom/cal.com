import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";
import { BlacklistType } from "@calcom/prisma/enums";

import type { IBlacklistRepository } from "./blacklist.repository.interface";

export class BlacklistRepository implements IBlacklistRepository {
  async getEmailInBlacklist(email: string) {
    const [, domain] = email.split("@");
    try {
      const emailInBlacklist = await db.blacklist.findFirst({
        where: {
          OR: [
            { type: BlacklistType.EMAIL, value: email },
            { type: BlacklistType.DOMAIN, value: domain },
          ],
        },
      });
      return emailInBlacklist;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
