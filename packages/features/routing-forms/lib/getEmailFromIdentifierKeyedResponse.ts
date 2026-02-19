type IdentifierKeyedResponse = Record<string, string | number | string[]> | null;

export function getEmailFromIdentifierKeyedResponse(
  identifierKeyedResponse: IdentifierKeyedResponse
): string | null {
  if (!identifierKeyedResponse) return null;

  const emailResponse = identifierKeyedResponse.email;

  if (typeof emailResponse === "string") {
    const trimmedEmail = emailResponse.trim();
    return trimmedEmail || null;
  }

  if (Array.isArray(emailResponse)) {
    const firstEmail = emailResponse[0];
    if (typeof firstEmail !== "string") return null;

    const trimmedEmail = firstEmail.trim();
    return trimmedEmail || null;
  }

  return null;
}
