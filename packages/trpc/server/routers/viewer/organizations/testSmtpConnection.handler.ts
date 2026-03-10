import {
  getSmtpConfigurationService,
  getSmtpService,
} from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";
import logger from "@calcom/lib/logger";
import { resolveAndValidateSmtpHost } from "@calcom/lib/validateSmtpHost";

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
      code: "UNAUTHORIZED",
      message: "You must be part of an organization to manage SMTP configurations",
    });
  }
  return organizationId;
}

export const testSmtpConnectionHandler = async ({ ctx, input }: TestSmtpConnectionOptions) => {
  const organizationId = getOrganizationId(ctx.user);
  const smtpService = getSmtpService();

  let user = input.smtpUser ?? "";
  let password = input.smtpPassword ?? "";

  if (input.configId && (!user || !password)) {
    const configService = getSmtpConfigurationService();
    const storedConfig = await configService.getConfigForOrg(organizationId);
    if (!storedConfig) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "SMTP configuration not found",
      });
    }
    if (!user) user = storedConfig.smtpUser;
    if (!password) password = storedConfig.smtpPassword;
  }

  if (!user || !password) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "SMTP username and password are required",
    });
  }

  // DNS rebinding protection: resolve hostname and check resolved IPs
  const hostCheck = await resolveAndValidateSmtpHost(input.smtpHost);
  if (!hostCheck.valid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: hostCheck.error || "SMTP host is not allowed",
    });
  }

  try {
    const result = await smtpService.testConnection({
      host: input.smtpHost,
      port: input.smtpPort,
      user,
      password,
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
