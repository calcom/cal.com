import type { AxiosError, AxiosRequestConfig } from "axios";
import { type AxiosInstance } from "axios";
// eslint-disable-next-line no-restricted-imports
import merge from "lodash/merge";

import type { SdkAuthOptions } from "../types";
import type { Endpoints } from "./endpoints";
import { getEndpointData } from "./endpoints";
import { CalApiError } from "./errors/cal-api-error";

interface HttpCallerOptions {
  shouldHandleRefresh?: boolean;
}

const X_CAL_SECRET_KEY = "x-cal-secret-key";

export class HttpCaller {
  constructor(
    private readonly clientId: string,
    private readonly axiosClient: AxiosInstance,
    private readonly authOptions: SdkAuthOptions,
    options?: HttpCallerOptions
  ) {
    if (options?.shouldHandleRefresh) {
      // TODO handle refresh pre-call.
      this.axiosClient.interceptors.request.use((config) => {
        return config;
      });
    }

    this.axiosClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          throw new CalApiError(error.response.statusText, error.response.status);
        } else if (error.request) {
          throw new Error("The request was made but no response was received");
        } else {
          throw new Error("An error occurred during the request setup");
        }
      }
    );
  }

  async post<T>(endpoint: Endpoints, body?: unknown, config?: AxiosRequestConfig<unknown>): Promise<T> {
    const { data } = await this.axiosClient.post<T>(
      this.createCallUrl(endpoint),
      body,
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

  async patch<T>(endpoint: Endpoints, body?: unknown, config?: AxiosRequestConfig<unknown>): Promise<T> {
    const { data } = await this.axiosClient.patch<T>(
      this.createCallUrl(endpoint),
      body,
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
