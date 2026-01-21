import { getSmtpService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";
import logger from "@calcom/lib/logger";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TTestSmtpConnectionInput } from "./testSmtpConnection.schema";

const log = logger.getSubLogger({ prefix: ["testSmtpConnection.handler"] });

type TestSmtpConnectionOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TTestSmtpConnectionInput;
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

export const testSmtpConnectionHandler = async ({ ctx, input }: TestSmtpConnectionOptions) => {
  getOrganizationId(ctx.user);
  const smtpService = getSmtpService();

  try {
    const result = await smtpService.testConnection({
      host: input.smtpHost,
      port: input.smtpPort,
      user: input.smtpUser,
      password: input.smtpPassword,
      secure: input.smtpSecure,
    });
    return result;
  } catch (error) {
    log.error("Test SMTP connection failed", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    };
  }
};

export default testSmtpConnectionHandler;
