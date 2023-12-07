import type { ERROR_STATUS, SUCCESS_STATUS, API_ERROR_CODES } from "@calcom/platform-constants";

export type ApiSuccessResponse<T> = { status: typeof SUCCESS_STATUS; data: T };

export type API_ERROR_CODES_TYPE = (typeof API_ERROR_CODES)[number];

export type ErrorType = {
  code: API_ERROR_CODES_TYPE;
  message?: string;
  details?: string;
};

export type ApiErrorResponse = { status: typeof ERROR_STATUS; error: ErrorType };

export type ApiResponse<T> = ApiErrorResponse | ApiSuccessResponse<T>;
