import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ApiErrorResponse } from "@calcom/platform-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts a user-friendly error message from various error types
 * Following the existing error handling patterns in the codebase
 */
export function getErrorMessage(error: unknown, fallbackMessage = "Something went wrong"): string {
  // If it's an ApiErrorResponse (the main case for atoms)
  if (error && typeof error === "object" && "error" in error) {
    const apiError = error as ApiErrorResponse;
    if (apiError.error?.message) {
      return apiError.error.message;
    }
  }

  // If it's a regular Error object
  if (error instanceof Error) {
    return error.message;
  }

  // If it's a string
  if (typeof error === "string") {
    return error;
  }

  // Fallback for unknown error types
  return fallbackMessage;
}
