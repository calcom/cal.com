import { createHash } from "crypto";

export interface PiiHasher {
  hash(input: string): string;
}

export class Md5PiiHasher implements PiiHasher {
  constructor(private readonly salt: string) {}
  hash(input: string) {
    return createHash("md5")
      .update(this.salt + input)
      .digest("hex");
  }
}

export const piiHasher: PiiHasher = new Md5PiiHasher(process.env.CALENDSO_ENCRYPTION_KEY!);

export const hashEmail = (email: string, hasher: PiiHasher = piiHasher): string => {
  const [localPart, domain] = email.split("@");
  // Simple hash function for email, can be replaced with a more complex one if needed
  return `${hasher.hash(localPart)}@${domain}`;
};
