import type { AxiosRequestConfig } from "axios";
import { type AxiosInstance } from "axios";
// eslint-disable-next-line no-restricted-imports
import merge from "lodash/merge";

import type { SdkAuthOptions } from "../types";
import type { Endpoints } from "./endpoints";
import { getEndpointData } from "./endpoints";

interface HttpCallerOptions {
  shouldHandleRefresh?: boolean;
}

const X_CAL_SECRET_KEY = "x-cal-secret-key";

export class HttpCaller {
  constructor(
    private readonly clientId: string,
    private readonly axiosClient: AxiosInstance,
    private readonly authOptions: SdkAuthOptions,
    private readonly options?: HttpCallerOptions
  ) {
    if (options?.shouldHandleRefresh) {
      // TODO handle refresh pre-call.
      axiosClient.interceptors.request.use((config) => {
        return config;
      });
    }
  }

  async post<T>(endpoint: Endpoints, input?: unknown, config?: AxiosRequestConfig<unknown>): Promise<T> {
    const { data } = await this.axiosClient.post<T>(
      this.createCallUrl(endpoint),
      input,
      this.wrapConfigWithAuth(endpoint, config)
    );
    return data;
  }

  async get<T>(endpoint: Endpoints, config?: AxiosRequestConfig<unknown>): Promise<T> {
    const { data } = await this.axiosClient.get<T>(
      this.createCallUrl(endpoint),
      this.wrapConfigWithAuth(endpoint, config)
    );
    return data;
  }

  async delete<T>(endpoint: Endpoints, config?: AxiosRequestConfig<unknown>): Promise<T> {
    const { data } = await this.axiosClient.delete<T>(
      this.createCallUrl(endpoint),
      this.wrapConfigWithAuth(endpoint, config)
    );
    return data;
  }

  private createCallUrl(endpoint: Endpoints): string {
    const { apiVersion, uri } = getEndpointData(endpoint);
    return `${apiVersion}${uri}`;
  }

  private wrapConfigWithAuth(
    endpoint: Endpoints,
    config?: AxiosRequestConfig<unknown>
  ): AxiosRequestConfig<unknown> {
    const { auth } = getEndpointData(endpoint);

    const headers: Record<string, unknown> = {};
    const params: Record<string, unknown> = {};

    if (this.authOptions.accessToken && auth === "access_token") {
      headers["Authorization"] = `Bearer ${this.authOptions.accessToken}`;
    }

    if (this.authOptions.clientSecret && auth === "secret") {
      headers[X_CAL_SECRET_KEY] = this.authOptions.clientSecret;
      params["clientId"] = this.clientId;
    }

    return merge(config, {
      headers,
      params,
    });
  }
}
