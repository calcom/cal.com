import { IdentityProvider } from "@calcom/prisma/enums";

/**
 * Maps NextAuth provider names to IdentityProvider enum values.
 * Includes aliases (e.g., "saml-idp" -> SAML).
 */
export const NEXTAUTH_TO_IDENTITY_PROVIDER: Record<string, IdentityProvider> = {
  "azure-ad": IdentityProvider.AZUREAD,
  google: IdentityProvider.GOOGLE,
  saml: IdentityProvider.SAML,
  "saml-idp": IdentityProvider.SAML,
  cal: IdentityProvider.CAL,
};

/**
 * Get IdentityProvider enum from NextAuth provider name.
 * Falls back to GOOGLE if not found (maintains existing behavior).
 */
export const getIdentityProvider = (nextAuthProvider: string): IdentityProvider => {
  return NEXTAUTH_TO_IDENTITY_PROVIDER[nextAuthProvider] ?? IdentityProvider.GOOGLE;
};
