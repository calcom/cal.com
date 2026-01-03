import { createHash } from "node:crypto";

export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string = "S256"
): boolean {
  if (method === "S256") {
    const expectedChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    return expectedChallenge === codeChallenge;
  }
  return false;
}

export function isValidCodeChallengeMethod(method: string): boolean {
  return method === "S256";
}
