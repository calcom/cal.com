import UserLockedEmail from "@calcom/emails/templates/user-locked-email";
import { getTranslation } from "@calcom/lib/server/i18n";
import { schemaTask } from "@trigger.dev/sdk";

import { userLockedEmailTaskConfig } from "./config";
import { userLockedEmailSchema } from "./schema";

export const sendUserLockedEmailTask = schemaTask({
  id: "user.locked-email.send",
  ...userLockedEmailTaskConfig,
  schema: userLockedEmailSchema,
  run: async (payload) => {
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
  },
});
