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

export * from "./slots/types";
