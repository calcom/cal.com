import slugify from "@calcom/lib/slugify";

export async function checkPremiumUsername(_username: string): Promise<{
  available: boolean;
  premium: boolean;
  message?: string;
  suggestion?: string;
}> {
  const username = slugify(_username);
  const response = await fetch("https://cal.com/api/username", {
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
