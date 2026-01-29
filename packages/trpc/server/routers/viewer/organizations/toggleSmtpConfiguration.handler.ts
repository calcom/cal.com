import { getSmtpConfigurationService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TToggleSmtpConfigurationInputSchema } from "./toggleSmtpConfiguration.schema";

type ToggleSmtpConfigurationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TToggleSmtpConfigurationInputSchema;
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

export default async function handler({ ctx, input }: ToggleSmtpConfigurationOptions) {
  const organizationId = getOrganizationId(ctx.user);
  const service = getSmtpConfigurationService();

  return service.toggleEnabled(input.id, organizationId, input.isEnabled);
}
