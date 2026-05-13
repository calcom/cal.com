import { z } from "zod";

export const bbbOptionsSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(1),
  hash: z.enum(["sha1", "sha256", "sha384", "sha512"]),
});
export type bbbOptions = z.infer<typeof bbbOptionsSchema>;

export const bbbEncryptedSchema = z.object({
  private: z.string().min(1),
});

export enum Role {
  MODERATOR = "MODERATOR",
  VIEWER = "VIEWER",
}
