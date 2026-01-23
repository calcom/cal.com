import { getSmtpConfigurationService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";
import { getTranslation } from "@calcom/lib/server/i18n";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TSendSmtpTestEmailInputSchema } from "./sendSmtpTestEmail.schema";

type SendSmtpTestEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSendSmtpTestEmailInputSchema;
};

function getOrganizationId(user: NonNullable<TrpcSessionUser>): number {
  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to manage SMTP configurations",
    });
  }
  return organizationId;
}

export default async function handler({ ctx, input }: SendSmtpTestEmailOptions) {
  const organizationId = getOrganizationId(ctx.user);
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
