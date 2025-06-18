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
  // Handle axios errors
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: {
        data?: ApiErrorResponse | { message?: string; error?: string | { message?: string } };
      };
      message?: string;
    };

    const responseData = axiosError.response?.data;

    if (responseData) {
      // Check if it's the second type with message property
      if ("message" in responseData && responseData.message) {
        return responseData.message;
      }

      // Check if it has error property
      if ("error" in responseData && responseData.error) {
        const errorData = responseData.error;

        // Check if error is an object with message
        if (typeof errorData === "object" && errorData.message) {
          return errorData.message;
        }

        // Check if error is a string
        if (typeof errorData === "string") {
          return errorData;
        }
      }

      // Check if it's ApiErrorResponse type
      if ("error" in responseData && responseData.error && typeof responseData.error === "object") {
        const apiErrorData = responseData as ApiErrorResponse;
        if (apiErrorData.error?.message) {
          return apiErrorData.error.message;
        }
      }
    }

    // Use axios error message if available
    if (axiosError.message) {
      return axiosError.message;
    }
  }

  // If it's an ApiErrorResponse (the main case for atoms)
  if (error && typeof error === "object" && "error" in error) {
    const apiError = error as ApiErrorResponse;
    if (apiError.error && typeof apiError.error === "object" && "message" in apiError.error) {
      return apiError.error.message || fallbackMessage;
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
