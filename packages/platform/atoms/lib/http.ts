import axios from "axios";

// Immediately Invoked Function Expression to create simple singleton class like

const http = (function () {
  const instance = axios.create({
    timeout: 10000,
    headers: {},
  });
  let refreshUrl = "";
  return {
    instance: instance,
    get: instance.get,
    post: instance.post,
    put: instance.put,
    patch: instance.patch,
    delete: instance.delete,
    responseInterceptor: instance.interceptors.response,
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
      instance.defaults.headers.common["x-cal-client-id"] = clientId;
    },
    getClientIdHeader: () => {
      return instance.defaults.headers.common?.["x-cal-client-id"]?.toString() ?? "";
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
