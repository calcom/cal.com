import { getSmtpConfigurationService } from "@calcom/features/di/smtp-configuration/containers/smtp-configuration";
import { getTranslation } from "@calcom/i18n/server";

import { TRPCError } from "@trpc/server";

import type { TSendSmtpTestEmailInputSchema } from "./send-smtp-test-email.schema";

type SendSmtpTestEmailUser = {
  locale: string | null;
  organizationId: number | null;
  profile?: {
    organizationId: number | null;
  } | null;
};

type SendSmtpTestEmailOptions = {
  ctx: {
    user: SendSmtpTestEmailUser;
  };
  input: TSendSmtpTestEmailInputSchema;
};

export default async function handler({ ctx, input }: SendSmtpTestEmailOptions) {
  const organizationId = ctx.user.profile?.organizationId || ctx.user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to manage SMTP configurations",
    });
  }
  const service = getSmtpConfigurationService();
  const language = await getTranslation(ctx.user.locale ?? "en", "common");

  return service.sendTestEmail(organizationId, input.toEmail, language);
}
