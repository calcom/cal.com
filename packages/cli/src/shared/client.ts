import { client } from "../generated/sdk.gen";
import { getApiUrl, getAuthToken } from "./config";

let initialized = false;

export async function initializeClient(): Promise<void> {
  if (initialized) return;

  const apiUrl = getApiUrl();

  client.setConfig({
    baseUrl: apiUrl,
    throwOnError: true,
  });

  client.interceptors.request.use(async (request) => {
    const token = await getAuthToken();
    request.headers.set("Authorization", `Bearer ${token}`);
    request.headers.set("Content-Type", "application/json");
    return request;
  });

  initialized = true;
}

export { client };
