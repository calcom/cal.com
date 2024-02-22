import axios from "axios";

// Immediately Invoked Function Expression to create simple singleton class like

const http = (function () {
  const instance = axios.create({
    timeout: 10000,
    headers: {},
  });
  let refreshUrl = "";
  let accessToken = "";
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
    setAuthorizationHeader: (token?: string) => {
      instance.defaults.headers.common["Authorization"] = `Bearer ${token ?? accessToken}`;
    },
    getAuthorizationHeader: () => {
      return instance.defaults.headers.common?.["Authorization"]?.toString() ?? "";
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
        accessToken = res.accessToken;
        return res.accessToken;
      }
      return "";
    },
  };
})();

export default http;
