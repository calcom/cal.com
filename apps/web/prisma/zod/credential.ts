import * as z from "zod";
import * as imports from "../zod-utils";
import { CompleteUser, UserModel } from "./index";

// Helper schema for JSON fields
type Literal = boolean | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const _CredentialModel = z.object({
  id: z.number().int(),
  type: z.string(),
  key: jsonSchema,
  userId: z.number().int().nullish(),
});

export interface CompleteCredential extends z.infer<typeof _CredentialModel> {
  user?: CompleteUser | null;
}

/**
 * CredentialModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const CredentialModel: z.ZodSchema<CompleteCredential> = z.lazy(() =>
  _CredentialModel.extend({
    user: UserModel.nullish(),
  })
);
