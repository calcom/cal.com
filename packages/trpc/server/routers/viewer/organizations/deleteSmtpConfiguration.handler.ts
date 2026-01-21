import { getSmtpConfigurationService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteSmtpConfigurationInput } from "./deleteSmtpConfiguration.schema";

type DeleteSmtpConfigurationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteSmtpConfigurationInput;
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

export const deleteSmtpConfigurationHandler = async ({ ctx, input }: DeleteSmtpConfigurationOptions) => {
  const organizationId = getOrganizationId(ctx.user);
  const service = getSmtpConfigurationService();

  await service.delete(input.id, organizationId);
  return { success: true };
};

export default deleteSmtpConfigurationHandler;
