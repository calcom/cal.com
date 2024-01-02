import axios from "axios";

// Immediately Invoked Function Expression to create simple singleton class like

const http = (function () {
  const instance = axios.create({
    timeout: 10000,
    headers: {},
  });
  let refreshUrl = "";

  return {
    get: instance.get,
    post: instance.post,
    put: instance.put,
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
  };
})();

export default http;
