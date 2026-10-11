import process from "node:process";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { jwtVerify, SignJWT } from "jose";

export const signJwt = async (payload: { email: string }): Promise<string> => {
  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    throw new Error("Missing CALENDSO_ENCRYPTION_KEY environment variable");
  }
  const secret = new TextEncoder().encode(process.env.CALENDSO_ENCRYPTION_KEY);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.email)
    .setIssuedAt()
    .setIssuer(WEBSITE_URL)
    .setAudience(`${WEBSITE_URL}/auth/login`)
    .setExpirationTime("2m")
    .sign(secret);
};

export const verifyTotpJwt = async (jwt: string): Promise<Awaited<ReturnType<typeof jwtVerify>>> => {
  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    throw new Error("Missing CALENDSO_ENCRYPTION_KEY environment variable");
  }
  const secret = new TextEncoder().encode(process.env.CALENDSO_ENCRYPTION_KEY);
  return jwtVerify(jwt, secret, {
    issuer: WEBSITE_URL,
    audience: `${WEBSITE_URL}/auth/login`,
    algorithms: ["HS256"],
    requiredClaims: ["exp", "sub"],
  });
};

export default signJwt;
