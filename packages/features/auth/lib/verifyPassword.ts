import { compare } from "bcryptjs";
import crypto from "crypto";

export async function verifyPassword(password: string, hashedPassword: string) {
  const isValid = await compare(password, hashedPassword);
  return isValid;
}

//password checking algo for users migrated from keycloak
export function verifyKeycloakPassword({
  inputPassword,
  storedHashBase64,
  saltBase64,
  iterations,
  algorithm = "sha256",
}: {
  inputPassword: string;
  storedHashBase64: string;
  saltBase64: string;
  iterations: number;
  algorithm?: string;
}) {
  const salt = Buffer.from(saltBase64, "base64");
  const storedHash = Buffer.from(storedHashBase64, "base64");

  const derivedKey = crypto.pbkdf2Sync(inputPassword, salt, iterations, storedHash.length, algorithm);

  return crypto.timingSafeEqual(derivedKey, storedHash);
}
