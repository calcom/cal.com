import type { AxiosError, AxiosRequestConfig } from "axios";
import { type AxiosInstance } from "axios";
// eslint-disable-next-line no-restricted-imports
import merge from "lodash/merge";

import type { Endpoints } from "./endpoints";
import { getEndpointData, getEndpointDefinition } from "./endpoints";
import { CalApiError } from "./errors/cal-api-error";
import type { SdkSecrets } from "./sdk-secrets";

interface HttpCallerOptions {
  shouldHandleRefresh?: boolean;
}

export const X_CAL_SECRET_KEY = "x-cal-secret-key";

type CallOptions = {
  urlParams?: Record<string, string> | string[];
  config?: AxiosRequestConfig<unknown>;
};

type CallOptionsWithBody<T = unknown> = CallOptions & {
  body: T;
};

export class HttpCaller {
  private awaitingRefresh = false;

  secrets: SdkSecrets | null = null;

  constructor(
    private readonly clientId: string,
    private readonly axiosClient: AxiosInstance,
    options?: HttpCallerOptions
  ) {
    if (options?.shouldHandleRefresh) {
      this.axiosClient.interceptors.request.use(async (config) => {
        if (this.awaitingRefresh && this.secrets) {
          await this.secrets.refreshAccessToken(this.clientId);
          this.awaitingRefresh = false;
        }
        return config;
      });
    }

    this.axiosClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.status === 498) {
          // tell HttpCaller to attempt a refresh on the subsequent request.
          // If options.shouldHandleRefresh is not set, the user will have to
          // handle the refreshing on their own.
          this.awaitingRefresh = true;
        }

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

  async post<T>(endpoint: Endpoints, options: CallOptionsWithBody): Promise<T> {
    const { data } = await this.axiosClient.post<T>(
      this.createCallUrl(endpoint, options.urlParams),
      options.body,
      this.wrapConfigWithAuth(endpoint, options.config)
    );
    return data;
  }

  async get<T>(endpoint: Endpoints, options: CallOptions): Promise<T> {
    const { data } = await this.axiosClient.get<T>(
      this.createCallUrl(endpoint, options.urlParams),
      this.wrapConfigWithAuth(endpoint, options.config)
    );
    return data;
  }

  async delete<T>(endpoint: Endpoints, options: CallOptions): Promise<T> {
    const { data } = await this.axiosClient.delete<T>(
      this.createCallUrl(endpoint, options.urlParams),
      this.wrapConfigWithAuth(endpoint, options.config)
    );
    return data;
  }

  async patch<T>(endpoint: Endpoints, options: CallOptionsWithBody): Promise<T> {
    const { data } = await this.axiosClient.patch<T>(
      this.createCallUrl(endpoint, options.urlParams),
      options.body,
      this.wrapConfigWithAuth(endpoint, options.config)
    );

    return data;
  }

  private createCallUrl(endpoint: Endpoints, params?: Record<string, string> | string[]): string {
    const { version, uri } = getEndpointData(endpoint, params);
    return `${version}${uri}`;
  }

  private wrapConfigWithAuth(
    endpoint: Endpoints,
    config?: AxiosRequestConfig<unknown>
  ): AxiosRequestConfig<unknown> {
    const { auth } = getEndpointDefinition(endpoint);

    const headers: Record<string, unknown> = {};
    const params: Record<string, unknown> = {};

    if (this.secrets?.getAccessToken() && auth === "access_token") {
      headers["Authorization"] = `Bearer ${this.secrets.getAccessToken()}`;
    }

    if (this.secrets?.getClientSecret() && auth === "secret") {
      headers[X_CAL_SECRET_KEY] = this.secrets.getClientSecret();
      params["clientId"] = this.clientId;
    }

    return merge(config, {
      headers,
      params,
    });
  }

  isAwaitingRefresh() {
    return this.awaitingRefresh;
  }
}
