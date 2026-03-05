export async function isTokenObjectUnusable(response: Response): Promise<{ reason: string } | null> {
  if (response.ok) return null;
  let responseBody: { error?: string };
  try {
    responseBody = await response.json();
  } catch {
    return null;
  }
  if (responseBody.error === "invalid_grant") {
    return { reason: responseBody.error };
  }
  return null;
}
