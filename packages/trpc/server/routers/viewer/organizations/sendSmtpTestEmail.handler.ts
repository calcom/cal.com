import { getSmtpConfigurationService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";
import { getTranslation } from "@calcom/i18n/server";

import { TRPCError } from "@trpc/server";

import type { TSendSmtpTestEmailInputSchema } from "./sendSmtpTestEmail.schema";

type SendSmtpTestEmailUser = {
  email: string | null;
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
  const userEmail = ctx.user.email;

  if (!userEmail) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User email is required to send test email",
    });
  }

  const language = await getTranslation(ctx.user.locale ?? "en", "common");

  return service.sendTestEmail(input.id, organizationId, userEmail, language);
}
