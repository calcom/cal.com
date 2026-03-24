export type UsernameSuggestionsResponse = {
  suggestions: string[];
};

export async function fetchUsernameSuggestions(base: string): Promise<UsernameSuggestionsResponse> {
  const response = await fetch("/api/username/suggestions", {
    credentials: "include",
    method: "POST",
    body: JSON.stringify({ base: base.trim() }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch username suggestions");
  }

  const data = (await response.json()) as UsernameSuggestionsResponse;
  return data;
}
