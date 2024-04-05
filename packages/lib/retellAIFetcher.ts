import { handleErrorsJson } from "@calcom/lib/errors";

export const fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
  console.log("fetcher", endpoint, init);
  return fetch(`https://api.retellai.com${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.RETELL_AI_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  }).then(handleErrorsJson);
};
