import type { Credential } from "@prisma/client";
import * as z from "zod";

import { CompleteUser, UserModel } from "./index";

// Helper schema for JSON data
type Literal = boolean | null | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const _CredentialModel = z.object({
  id: z.number().int(),
  type: z.string(),
  key: jsonSchema,
  userId: z.number().int().nullable(),
});

export interface CompleteCredential extends Credential {
  user: CompleteUser | null;
}

/**
 * CredentialModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const CredentialModel: z.ZodSchema<CompleteCredential> = z.lazy(() =>
  _CredentialModel.extend({
    user: UserModel.nullable(),
  })
);
