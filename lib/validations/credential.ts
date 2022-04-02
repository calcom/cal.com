import { withValidation } from "next-validations";
import { z } from "zod";

import { _CredentialModel as Credential } from "@calcom/prisma/zod";

import { jsonSchema } from "./shared/jsonSchema";

const schemaCredentialBaseBodyParams = Credential.omit({ id: true, userId: true }).partial();

const schemaCredentialRequiredParams = z.object({
  type: z.string(),
  key: jsonSchema,
});

export const schemaCredentialBodyParams = schemaCredentialBaseBodyParams.merge(
  schemaCredentialRequiredParams
);

export const schemaCredentialPublic = Credential.omit({});

export const withValidCredential = withValidation({
  schema: schemaCredentialBodyParams,
  type: "Zod",
  mode: "body",
});
