import { WEBAPP_URL } from "@calcom/lib/constants";

export function getHref(
  baseURL: string,
  activeSettingsOption: { credentialId: string; activeOption: string }
) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set(activeSettingsOption.credentialId, activeSettingsOption.activeOption);
  return baseUrlParsed.toString();
}
