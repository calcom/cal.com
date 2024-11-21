import { z } from "zod";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["domainWideDelegation/utils"] });
export class InvalidServiceAccountKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidServiceAccountKeyError";
  }
}

export function parseServiceAccountKey(serviceAccountKey: Prisma.JsonValue) {
  if (!serviceAccountKey) {
    return null;
  }
  const schema = z.object({
    client_id: z.string(),
    private_key: z.string(),
    client_email: z.string(),
  });

  const parsedServiceAccountKey = schema.safeParse(serviceAccountKey);

  if (!parsedServiceAccountKey.success) {
    console.error("Invalid service account key", parsedServiceAccountKey.error);
    throw new InvalidServiceAccountKeyError(
      "Service account key must contain private_key, client_email and client_id"
    );
  }

  return parsedServiceAccountKey.data;
}

export const handleDomainWideDelegationError = (error: unknown) => {
  if (error instanceof InvalidServiceAccountKeyError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  if (error instanceof TRPCError) {
    throw error;
  }

  log.error("Error handling domain-wide delegation:", safeStringify(error));
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An error occurred while handling domain-wide delegation settings.",
  });
};

export const ensureNoServiceAccountKey = <T extends { id: string; serviceAccountKey?: unknown }>(
  domainWideDelegation: T
) => {
  const { serviceAccountKey: _1, ...rest } = domainWideDelegation;
  return {
    ...rest,
    serviceAccountKey: undefined,
  };
};
