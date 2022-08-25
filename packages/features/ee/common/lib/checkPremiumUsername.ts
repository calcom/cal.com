import { FORBIDDEN_USERNAMES, WEBSITE_URL } from "@calcom/lib/constants";
import slugify from "@calcom/lib/slugify";

interface ResponseUsernameApi {
  available: boolean;
  premium: boolean;
  message?: string;
  suggestion?: string;
}

export async function checkPremiumUsername(_username: string): Promise<ResponseUsernameApi> {
  const username = slugify(_username);
  if (username in FORBIDDEN_USERNAMES) {
    return {
      available: false as const,
      premium: false,
      message: "A user exists with that username",
    };
  }

  const response = await fetch(`${WEBSITE_URL}/api/username`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
    method: "POST",
    mode: "cors",
  });

  const json = await response.json();
  return json;
}
