import type { IdentityProvider } from "@prisma/client";

export const identityProvider: { [K in IdentityProvider]: K } = {
  CAL: "CAL",
  GOOGLE: "GOOGLE",
  SAML: "SAML",
};

export default identityProvider;
