type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

export type XOR<T, Y> = T extends object ? Without<Exclude<Y, T>, T> & T : T;

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

export * from "./endpoints/slots/types";
