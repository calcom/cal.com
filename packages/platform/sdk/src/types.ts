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
  V1 = "v1",
  V2 = "v2",
}

export * from "./endpoints/slots/types";
