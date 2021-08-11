import { hash, compare } from "bcryptjs";

export async function hashPassword(password) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}

export async function verifyPassword(password, hashedPassword) {
  const isValid = await compare(password, hashedPassword);
  return isValid;
}

export const parseTokenPayload = (token: string): any => {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  } catch (e) {
    return null;
  }
};
