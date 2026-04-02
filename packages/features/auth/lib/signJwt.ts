import process from "node:process";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { SignJWT } from "jose";

const signJwt = async (payload: { email: string }) => {
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

export default signJwt;
