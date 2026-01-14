import { randomBytes, createHash } from "crypto";

const generateSecureHash = (plainTextToken: string): string => {
  const sha256Hasher = createHash("sha256");
  sha256Hasher.update(plainTextToken);
  return sha256Hasher.digest("hex");
};

const createFreshAuthenticationToken = (
  randomToken = randomBytes(16).toString("hex")
): readonly [string, string] => {
  const hashedVersion = generateSecureHash(randomToken);
  return [hashedVersion, randomToken] as const;
};

export { generateSecureHash, createFreshAuthenticationToken };
