// Google
export const GOOGLE_API_CREDENTIALS = process.env.GOOGLE_API_CREDENTIALS || "{}";
export const { client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET } =
  JSON.parse(GOOGLE_API_CREDENTIALS)?.web || {};
export const GOOGLE_LOGIN_ENABLED = process.env.GOOGLE_LOGIN_ENABLED === "true";
export const IS_GOOGLE_LOGIN_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_LOGIN_ENABLED);

// Passkeys
export const IS_PASSKEY_LOGIN_ENABLED = !!(
  process.env.PASSKEY_LOGIN_ENABLED === "true" &&
  process.env.NEXT_PUBLIC_HANKO_PASSKEYS_TENANT_ID &&
  process.env.HANKO_PASSKEYS_API_KEY
);

// SAML
export const IS_SAML_LOGIN_ENABLED = !!(process.env.SAML_DATABASE_URL && process.env.SAML_ADMINS);
