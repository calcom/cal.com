import { getSmtpConfigurationService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TSetSmtpConfigurationAsPrimaryInput } from "./setSmtpConfigurationAsPrimary.schema";

type SetSmtpConfigurationAsPrimaryOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetSmtpConfigurationAsPrimaryInput;
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

export const setSmtpConfigurationAsPrimaryHandler = async ({
  ctx,
  input,
}: SetSmtpConfigurationAsPrimaryOptions) => {
  const organizationId = getOrganizationId(ctx.user);
  const service = getSmtpConfigurationService();

  await service.setAsPrimary(input.id, organizationId);
  return { success: true };
};

export default setSmtpConfigurationAsPrimaryHandler;
