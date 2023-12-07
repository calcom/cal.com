import type { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export type ApiSuccessResponse<T> = { status: typeof SUCCESS_STATUS; data: T };

export type ErrorType = {
  code: string;
  message?: string;
  details?: string;
};

export type ApiErrorResponse = { status: typeof ERROR_STATUS; error: ErrorType };

export type ApiResponse<T> = ApiErrorResponse | ApiSuccessResponse<T>;
