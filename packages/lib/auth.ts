import { compare, hash } from "bcryptjs";

export async function hashPassword(password: string) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}

export async function verifyPassword(password: string, hashedPassword: string) {
  const isValid = await compare(password, hashedPassword);
  return isValid;
}

export function isPasswordValid(password: string) {
  let cap = false,
    low = false,
    num = false,
    min = false;
  if (password.length > 6) min = true;
  for (let i = 0; i < password.length; i++) {
    if (!isNaN(parseInt(password[i]))) num = true;
    else {
      if (password[i] === password[i].toUpperCase()) cap = true;
      if (password[i] === password[i].toLowerCase()) low = true;
    }
  }
  return cap && low && num && min;
}
