import type { ERROR_STATUS, SUCCESS_STATUS, API_ERROR_CODES } from "@calcom/platform-constants";

export type ApiSuccessResponse<T> = { status: typeof SUCCESS_STATUS; data: T };

export type API_ERROR_CODES_TYPE = (typeof API_ERROR_CODES)[number];

export type ErrorType = {
  code: API_ERROR_CODES_TYPE | string;
  message?: string;
  details?: string | string[];
};

export type ApiErrorResponse = {
  status: typeof ERROR_STATUS;
  timestamp?: string;
  path?: string;
  error: ErrorType;
};

export type ApiResponse<T> = ApiErrorResponse | ApiSuccessResponse<T>;
