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

  private requestQueue: Array<() => void> = [];

  constructor(
    private readonly clientId: string,
    private readonly axiosClient: AxiosInstance,
    private readonly options?: HttpCallerOptions
  ) {
    if (options?.shouldHandleRefresh) {
      this.setupInterceptors();
    }
  }

  private async retryQueuedRequests() {
    while (this.requestQueue.length > 0) {
      const retryRequest = this.requestQueue.shift();
      if (retryRequest) {
        retryRequest();
      }
    }
  }

  private setupInterceptors() {
    this.axiosClient.interceptors.request.use(async (config) => {
      if (this.awaitingRefresh) {
        // Return a new promise that resolves when the refresh is complete
        // and then retries the request.
        return new Promise((resolve) => {
          this.requestQueue.push(() => resolve(config));
        });
      }
      return config;
    });

    this.axiosClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 498) {
          if (!this.awaitingRefresh) {
            this.awaitingRefresh = true;

            try {
              await this.secrets?.refreshAccessToken(this.clientId);
              await this.retryQueuedRequests();
            } catch (refreshError) {
              console.error("Failed to refresh token:", refreshError);
              // Optionally, clear the queue on failure to prevent hanging requests
              this.requestQueue = [];
            } finally {
              this.awaitingRefresh = false;
            }
          }

          // Re-queue the failed request for retry after refresh
          return new Promise((resolve, reject) => {
            this.requestQueue.push(() => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              this.axiosClient.request(error.config!).then(resolve).catch(reject);
            });
          });
        }

        if (error.response) {
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

  async get<T>(endpoint: Endpoints, options?: CallOptions): Promise<T> {
    const { data } = await this.axiosClient.get<T>(
      this.createCallUrl(endpoint, options?.urlParams),
      this.wrapConfigWithAuth(endpoint, options?.config)
    );
    return data;
  }

  async delete<T>(endpoint: Endpoints, options?: CallOptions): Promise<T> {
    const { data } = await this.axiosClient.delete<T>(
      this.createCallUrl(endpoint, options?.urlParams),
      this.wrapConfigWithAuth(endpoint, options?.config)
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
}
