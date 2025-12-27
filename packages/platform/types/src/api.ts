import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import type { Response as BaseResponse } from "express";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { API_ERROR_CODES, REDIRECT_STATUS } from "@calcom/platform-constants";

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

export class ApiResponseWithoutData {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
}
