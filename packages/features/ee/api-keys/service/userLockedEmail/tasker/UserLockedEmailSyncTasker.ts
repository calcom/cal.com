import UserLockedEmail from "@calcom/emails/templates/user-locked-email";
import { getTranslation } from "@calcom/lib/server/i18n";
import { nanoid } from "nanoid";
import type { Logger } from "tslog";

import type { IUserLockedEmailTasker, UserLockedEmailPayload } from "./types";

export class UserLockedEmailSyncTasker implements IUserLockedEmailTasker {
  constructor(private readonly logger: Logger<unknown>) {}

  async sendEmail(payload: UserLockedEmailPayload): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;

    this.logger.debug(
      `Processing sendUserLockedEmail task for userId ${payload.userId}, email ${payload.email}`
    );

    const t = await getTranslation(payload.locale, "common");

    const email = new UserLockedEmail({
      language: t,
      user: {
        name: payload.name,
        email: payload.email,
      },
      lockReason: payload.lockReason,
    });

    await email.sendEmail();

    this.logger.debug(`Successfully sent user locked email for userId ${payload.userId}`);

    return { runId };
  }
}
