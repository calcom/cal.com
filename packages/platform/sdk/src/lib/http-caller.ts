import type { AxiosRequestConfig } from "axios";
import { type AxiosInstance } from "axios";

interface HttpCallerOptions {
  shouldHandleRefresh?: boolean;
}

export class HttpCaller {
  constructor(private readonly axiosClient: AxiosInstance, private readonly options?: HttpCallerOptions) {
    if (options?.shouldHandleRefresh) {
      // TODO handle refresh pre-call.
      axiosClient.interceptors.request.use((config) => {
        return config;
      });
    }
  }

  async post<T>(url: string, input?: any, config?: AxiosRequestConfig<any>): Promise<T> {
    const { data } = await this.axiosClient.post<T>(url, input, config);
    return data;
  }

  async get<T>(url: string, config?: AxiosRequestConfig<any>): Promise<T> {
    const { data } = await this.axiosClient.get<T>(url, config);
    return data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig<any>): Promise<T> {
    const { data } = await this.axiosClient.delete<T>(url, config);
    return data;
  }
}
