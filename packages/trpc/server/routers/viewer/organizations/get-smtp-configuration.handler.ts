import { getSmtpConfigurationService } from "@calcom/features/di/smtp-configuration/containers/smtp-configuration";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type GetSmtpConfigurationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getSmtpConfigurationHandler = async ({ ctx }: GetSmtpConfigurationOptions) => {
  const organizationId = ctx.user.profile?.organizationId || ctx.user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to manage SMTP configurations",
    });
  }
  const service = getSmtpConfigurationService();

  return service.getByOrgId(organizationId);
};

export default getSmtpConfigurationHandler;
