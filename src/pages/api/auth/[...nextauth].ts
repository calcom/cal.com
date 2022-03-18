import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";

import { defaultCookies } from "@calcom/lib/default-cookies";
import { serverConfig } from "@calcom/lib/serverConfig";
import prisma from "@calcom/prisma";

const WEBSITE_BASE_URL = process.env.WEBSITE_BASE_URL || "";


export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      maxAge: 10 * 60 * 60, // Magic links are valid for 10 min only
      // sendVerificationRequest,
    }),
  ],
  secret: process.env.SECRET,
  cookies: defaultCookies(WEBSITE_BASE_URL?.startsWith("https://")),
  session: {
    strategy: "jwt",
  },
    jwt: {
    // A secret to use for key generation (you should set this explicitly)
    secret: process.env.SECRET,
    // Set to true to use encryption (default: false)
    // encryption: true,
  },
  // Enable debug messages in the console if you are having problems
  debug: true,
});
