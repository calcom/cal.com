export interface CalSdkConstructorOptions {
  baseUrl?: string;
  handleRefresh?: boolean;
  httpRetries?: CalSdkHttpRetries;
}

interface CalSdkHttpRetries {
  maxAmount: number;
}

export type ResponseStatus = "success" | "error";

export interface BasicPlatformResponse<T = unknown> {
  status: ResponseStatus;
  data: T;
}

export enum ApiVersion {
  V1 = "v1/",
  V2 = "v2/",
  NEUTRAL = "/",
}

export type SdkAuthOptions = {
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
};

export type PaginationOptions = {
  limit?: number;
  skip?: number;
};

export * from "./endpoints/slots/types";
export * from "./endpoints/schedules/types";
export * from "./endpoints/events/types";
export * from "./endpoints/oauth-flow/types";
