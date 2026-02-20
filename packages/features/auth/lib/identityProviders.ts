import { IdentityProvider } from "@calcom/prisma/enums";

/**
 * Maps IdentityProvider enum values to NextAuth provider names.
 * Single source of truth for this mapping.
 */
export const IDENTITY_PROVIDER_TO_NEXTAUTH: Record<IdentityProvider, string> = {
  [IdentityProvider.AZUREAD]: "azure-ad",
  [IdentityProvider.GOOGLE]: "google",
  [IdentityProvider.SAML]: "saml",
  [IdentityProvider.CAL]: "cal",
};

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
 * Get NextAuth provider name from IdentityProvider enum.
 * Falls back to lowercase of the identity provider if not found.
 */
export const getNextAuthProviderName = (identityProvider: IdentityProvider | string): string => {
  return (
    IDENTITY_PROVIDER_TO_NEXTAUTH[identityProvider as IdentityProvider] ?? identityProvider.toLowerCase()
  );
};

/**
 * Get IdentityProvider enum from NextAuth provider name.
 * Falls back to GOOGLE if not found (maintains existing behavior).
 */
export const getIdentityProvider = (nextAuthProvider: string): IdentityProvider => {
  return NEXTAUTH_TO_IDENTITY_PROVIDER[nextAuthProvider] ?? IdentityProvider.GOOGLE;
};
