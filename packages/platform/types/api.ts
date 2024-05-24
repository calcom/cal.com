import { Transform } from "class-transformer";
import { IsNumber, Min, Max, IsOptional } from "class-validator";
import type { Response as BaseResponse } from "express";

import type {
  ERROR_STATUS,
  SUCCESS_STATUS,
  API_ERROR_CODES,
  REDIRECT_STATUS,
} from "@calcom/platform-constants";

export type ApiSuccessResponse<T> = { status: typeof SUCCESS_STATUS; data: T };
export type ApiSuccessResponseWithoutData = { status: typeof SUCCESS_STATUS };

export type API_ERROR_CODES_TYPE = (typeof API_ERROR_CODES)[number];

export type ErrorType = {
  code: API_ERROR_CODES_TYPE | string;
  message?: string;
  details?: string | string[] | object;
};

export type ApiErrorResponse = {
  status: typeof ERROR_STATUS;
  timestamp?: string;
  path?: string;
  error: ErrorType;
};

export type ApiRedirectResponseType = {
  status: typeof REDIRECT_STATUS;
  url: string;
};

export type Response<T = unknown> = BaseResponse<ApiResponse<T>>;

export type ApiResponse<T = undefined> = T extends undefined
  ? ApiSuccessResponseWithoutData | ApiErrorResponse
  : ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiResponseMaybeRedirect<T = undefined> = ApiResponse<T> | ApiRedirectResponseType;

export class Pagination {
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  offset?: number | null;
}
