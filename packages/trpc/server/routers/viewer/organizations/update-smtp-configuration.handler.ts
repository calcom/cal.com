import { getSmtpConfigurationService } from "@calcom/features/di/smtp-configuration/containers/smtp-configuration";
import { resolveAndValidateSmtpHost } from "@calcom/lib/validateSmtpHost";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TUpdateSmtpConfigurationInput } from "./update-smtp-configuration.schema";

type UpdateSmtpConfigurationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateSmtpConfigurationInput;
};

export const updateSmtpConfigurationHandler = async ({ ctx, input }: UpdateSmtpConfigurationOptions) => {
  const organizationId = ctx.user.profile?.organizationId || ctx.user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to manage SMTP configurations",
    });
  }

  if (input.smtpHost !== undefined) {
    const hostCheck = await resolveAndValidateSmtpHost(input.smtpHost);
    if (!hostCheck.valid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: hostCheck.error || "SMTP host is not allowed",
      });
    }
  }

  const service = getSmtpConfigurationService();

  return service.update(organizationId, {
    fromEmail: input.fromEmail,
    fromName: input.fromName,
    smtpHost: input.smtpHost,
    smtpPort: input.smtpPort,
    smtpUser: input.smtpUser,
    smtpPassword: input.smtpPassword,
    smtpSecure: input.smtpSecure,
  });
};

export default updateSmtpConfigurationHandler;
