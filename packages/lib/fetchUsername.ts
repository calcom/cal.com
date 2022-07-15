type ResponseUsernameApi = {
  available: boolean;
  premium: boolean;
  message?: string;
  suggestion?: string;
};

export async function fetchUsername(username: string) {
  const response = await fetch("/api/username", {
    credentials: "include",
    method: "POST",
    body: JSON.stringify({
      username: username.trim(),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = (await response.json()) as ResponseUsernameApi;
  return { response, data };
}
