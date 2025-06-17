import axios from "axios";

import { CAL_API_VERSION_HEADER, X_CAL_CLIENT_ID, X_CAL_PLATFORM_EMBED } from "@calcom/platform-constants";

import { getErrorMessage } from "../src/lib/utils";

// Global toast function and settings that will be set by components
let globalToastFunction: ((message: string, variant: "success" | "warning" | "error") => void) | null = null;
let globalDisableToasts = false;

// Immediately Invoked Function Expression to create simple singleton class like
const http = (function () {
  const instance = axios.create({
    timeout: 10000,
    headers: {},
  });

  // Response interceptor for global error handling
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // show toast if global toasts are enabled and toast function is available
      if (globalToastFunction && !globalDisableToasts) {
        const errorMessage = getErrorMessage(error, "Something went wrong");
        globalToastFunction(errorMessage, "error");
      }

      // re-throw the error so individual components can still handle it if needed
      return Promise.reject(error);
    }
  );

  let refreshUrl = "";
  return {
    instance: instance,
    get: instance.get,
    post: instance.post,
    put: instance.put,
    patch: instance.patch,
    delete: instance.delete,
    responseInterceptor: instance.interceptors.response,
    // method to set the global toast function and disable setting
    setGlobalToastFunction: (toastFn: typeof globalToastFunction) => {
      globalToastFunction = toastFn;
    },
    setGlobalDisableToasts: (disabled: boolean) => {
      globalDisableToasts = disabled;
    },
    setRefreshUrl: (url: string) => {
      refreshUrl = url;
    },
    getRefreshUrl: () => {
      return refreshUrl;
    },
    setUrl: (url: string) => {
      instance.defaults.baseURL = url;
    },
    getUrl: () => {
      return instance.defaults.baseURL;
    },
    setAuthorizationHeader: (accessToken: string) => {
      instance.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    },
    getAuthorizationHeader: () => {
      return instance.defaults.headers.common?.["Authorization"]?.toString() ?? "";
    },
    setClientIdHeader: (clientId: string) => {
      instance.defaults.headers.common[X_CAL_CLIENT_ID] = clientId;
    },
    getClientIdHeader: () => {
      return instance.defaults.headers.common?.[X_CAL_CLIENT_ID]?.toString() ?? "";
    },
    setPlatformEmbedHeader: (isEmbed: boolean) => {
      instance.defaults.headers.common[X_CAL_PLATFORM_EMBED] = isEmbed.toString();
    },
    getPlatformEmbedHeader: () => {
      return instance.defaults.headers.common?.[X_CAL_PLATFORM_EMBED]?.toString() ?? "";
    },
    setVersionHeader: (clientId: string) => {
      instance.defaults.headers.common[CAL_API_VERSION_HEADER] = clientId;
    },
    getVersionHeader: () => {
      return instance.defaults.headers.common?.[X_CAL_CLIENT_ID]?.toString() ?? "";
    },
    refreshTokens: async (refreshUrl: string): Promise<string> => {
      const response = await fetch(`${refreshUrl}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: http.getAuthorizationHeader(),
        },
      });
      const res = await response.json();
      if (res.accessToken) {
        http.setAuthorizationHeader(res.accessToken);
        return res.accessToken;
      }
      return "";
    },
  };
})();

export default http;
