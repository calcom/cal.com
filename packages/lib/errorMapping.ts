import { TRPCError } from "@trpc/server";

import {
  AuthorizationError,
  ValidationError,
  NotFoundError,
  CredentialError,
  OrganizationError,
} from "./errors";

export function mapBusinessErrorToTRPCError(error: unknown): TRPCError {
  if (error instanceof AuthorizationError) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: error.message,
    });
  }

  if (error instanceof ValidationError) {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  if (error instanceof NotFoundError) {
    return new TRPCError({
      code: "NOT_FOUND",
      message: error.message,
    });
  }

  if (error instanceof CredentialError) {
    return new TRPCError({
      code: "FORBIDDEN",
      message: error.message,
    });
  }

  if (error instanceof OrganizationError) {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  if (error instanceof TRPCError) {
    return error;
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: error instanceof Error ? error.message : "An unexpected error occurred",
  });
}
