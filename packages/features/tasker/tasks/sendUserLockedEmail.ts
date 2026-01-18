import UserLockedEmail from "@calcom/emails/templates/user-locked-email";

import { LockReason } from "@calcom/features/ee/api-keys/lib/autoLock";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { z } from "zod";

const log = logger.getSubLogger({ prefix: ["sendUserLockedEmail"] });

export const sendUserLockedEmailPayloadSchema = z.object({
  userId: z.number(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  lockReason: z.nativeEnum(LockReason),
  locale: z.string().optional().default("en"),
});

export type SendUserLockedEmailPayload = z.infer<typeof sendUserLockedEmailPayloadSchema>;

export async function sendUserLockedEmail(payload: string): Promise<void> {
  try {
    const data = sendUserLockedEmailPayloadSchema.parse(JSON.parse(payload));

    log.debug(`Processing sendUserLockedEmail task for userId ${data.userId}, email ${data.email}`);

    const t = await getTranslation(data.locale, "common");

    const email = new UserLockedEmail({
      language: t,
      user: {
        name: data.name,
        email: data.email,
      },
      lockReason: data.lockReason,
    });

    await email.sendEmail();

    log.debug(`Successfully sent user locked email for userId ${data.userId}`);
  } catch (error) {
    log.error(`Failed to send user locked email`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function sendUserLockedEmailSync(data: SendUserLockedEmailPayload): Promise<void> {
  const t = await getTranslation(data.locale, "common");

  const email = new UserLockedEmail({
    language: t,
    user: {
      name: data.name,
      email: data.email,
    },
    lockReason: data.lockReason,
  });

  await email.sendEmail();
}
