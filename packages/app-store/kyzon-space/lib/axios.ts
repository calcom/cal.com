import axios from "axios";

export const kyzonBaseUrl = "https://kyzonsolutions.com/api/cloud";

export const kyzonAxiosInstance = axios.create({
  baseURL: kyzonBaseUrl,
});
