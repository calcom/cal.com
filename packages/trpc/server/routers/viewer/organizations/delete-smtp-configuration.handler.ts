import { getSmtpConfigurationService } from "@calcom/features/di/smtp-configuration/containers/smtp-configuration";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type DeleteSmtpConfigurationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const deleteSmtpConfigurationHandler = async ({ ctx }: DeleteSmtpConfigurationOptions) => {
  const organizationId = ctx.user.profile?.organizationId || ctx.user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to manage SMTP configurations",
    });
  }
  const service = getSmtpConfigurationService();

  await service.delete(organizationId);
  return { success: true };
};

export default deleteSmtpConfigurationHandler;
