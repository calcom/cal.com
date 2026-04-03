export function getEnvClientId(): string {
  const clientId = process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_OAUTH2_CLIENT_ID is not defined");
  return clientId;
}
