import { getSmtpConfigurationService } from "@calcom/features/di/smtp-configuration/containers/smtp-configuration";
import { resolveAndValidateSmtpHost } from "@calcom/lib/validateSmtpHost";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateSmtpConfigurationInput } from "./create-smtp-configuration.schema";

type CreateSmtpConfigurationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateSmtpConfigurationInput;
};

export const createSmtpConfigurationHandler = async ({ ctx, input }: CreateSmtpConfigurationOptions) => {
  const organizationId = ctx.user.profile?.organizationId || ctx.user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to manage SMTP configurations",
    });
  }

  const hostCheck = await resolveAndValidateSmtpHost(input.smtpHost);
  if (!hostCheck.valid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: hostCheck.error || "SMTP host is not allowed",
    });
  }

  const service = getSmtpConfigurationService();

  return service.create({
    teamId: organizationId,
    fromEmail: input.fromEmail,
    fromName: input.fromName,
    smtpHost: input.smtpHost,
    smtpPort: input.smtpPort,
    smtpUser: input.smtpUser,
    smtpPassword: input.smtpPassword,
    smtpSecure: input.smtpSecure,
  });
};

export default createSmtpConfigurationHandler;
