import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, Min, Max, IsOptional } from "class-validator";
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

export class Pagination {
  @ApiProperty({ required: false, description: "The number of items to return", example: 10 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(250)
  @IsOptional()
  limit?: number;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @ApiProperty({ required: false, description: "The number of items to skip", example: 0 })
  @IsNumber()
  @Min(0)
  @Max(250)
  @IsOptional()
  offset?: number | null;
}

export class SkipTakePagination {
  @ApiProperty({ required: false, description: "The number of items to return", example: 10 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(250)
  @IsOptional()
  take?: number;

  @ApiProperty({ required: false, description: "The number of items to skip", example: 0 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  skip?: number;
}

export class ApiResponseWithoutData {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
}
