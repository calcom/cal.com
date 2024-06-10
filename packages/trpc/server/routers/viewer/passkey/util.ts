import { WEBAPP_URL, PASSKEY_TIMEOUT } from "@calcom/lib/constants";

/**
 * Extracts common fields to identify the RP (relying party)
 */
export const getAuthenticatorRegistrationOptions = () => {
  const webAppBaseUrl = new URL(WEBAPP_URL);
  const rpId = webAppBaseUrl.hostname;

  return {
    rpName: "Calcom",
    rpId,
    origin: WEBAPP_URL,
    timeout: PASSKEY_TIMEOUT,
  };
};
