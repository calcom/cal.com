import { IdentityProvider } from "@calcom/prisma/enums";

export const identityProviderNameMap: { [key in IdentityProvider]: string } = {
  [IdentityProvider.CAL]: "Cal",
  [IdentityProvider.GOOGLE]: "Google",
  [IdentityProvider.SAML]: "SAML",
};
