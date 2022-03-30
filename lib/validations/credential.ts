import { withValidation } from "next-validations";

import { _CredentialModel as Credential } from "@calcom/prisma/zod";

export const schemaCredentialBodyParams = Credential.omit({ id: true });

export const schemaCredentialPublic = Credential.omit({});

export const withValidCredential = withValidation({
  schema: schemaCredentialBodyParams,
  type: "Zod",
  mode: "body",
});
