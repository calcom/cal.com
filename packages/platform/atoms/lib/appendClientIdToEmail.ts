export function appendClientIdToEmail(email: string, clientId: string): string {
  const [localPart, domain] = email.split("@");
  return `${localPart}+${clientId}@${domain}`;
}
