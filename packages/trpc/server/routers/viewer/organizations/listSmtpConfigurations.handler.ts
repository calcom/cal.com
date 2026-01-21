import { getSmtpConfigurationService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type ListSmtpConfigurationsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
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

export const listSmtpConfigurationsHandler = async ({ ctx }: ListSmtpConfigurationsOptions) => {
  const organizationId = getOrganizationId(ctx.user);
  const service = getSmtpConfigurationService();

  return service.listByOrganization(organizationId);
};

export default listSmtpConfigurationsHandler;
