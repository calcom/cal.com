import slugify from "@lib/slugify";

export async function checkPremiumUsername(_username: string) {
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

  if (response.ok) {
    return {
      available: true as const,
    };
  }
  const json = await response.json();
  return {
    available: false as const,
    message: json.message as string,
  };
}
