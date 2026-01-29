import { getSmtpConfigurationService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetSmtpConfigurationInput } from "./getSmtpConfiguration.schema";

type GetSmtpConfigurationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetSmtpConfigurationInput;
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

export const getSmtpConfigurationHandler = async ({ ctx, input }: GetSmtpConfigurationOptions) => {
  const organizationId = getOrganizationId(ctx.user);
  const service = getSmtpConfigurationService();

  const config = await service.getById(input.id, organizationId);
  if (!config) {
    throw new TRPCError({ code: "NOT_FOUND", message: "SMTP configuration not found" });
  }
  return config;
};

export default getSmtpConfigurationHandler;
