import { handleErrorsJson } from "@calcom/lib/errors";
import { getDailyAppKeys } from "./getDailyAppKeys";

export const fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
  const { api_key } = await getDailyAppKeys();
  return fetch(`https://api.daily.co/v1${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  }).then(handleErrorsJson);
};
