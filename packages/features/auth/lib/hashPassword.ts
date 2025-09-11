import { hash } from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(password: string) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}

function generateSalt(byteLength = 16) {
  const salt = crypto.randomBytes(byteLength);
  return salt.toString("base64");
}

export function hashPasswordWithSalt(password: string) {
  const salt = generateSalt();
  const iterations = 27500;
  const keyLength = 32; // 32 bytes for sha256
  const digest = "sha256";
  const hash = crypto.pbkdf2Sync(password, Buffer.from(salt, "base64"), iterations, keyLength, digest);
  const hashBase64 = hash.toString("base64");
  return {
    hash: hashBase64,
    salt,
  };
}
