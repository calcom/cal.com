import { IdentityProvider, UserPermissionRole } from "@prisma/client";
import { readFileSync } from "fs";
import Handlebars from "handlebars";
import NextAuth, { Session } from "next-auth";
import type { Provider } from "next-auth/providers";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import nodemailer, { TransportOptions } from "nodemailer";
import { authenticator } from "otplib";
import path from "path";

import checkLicense from "@calcom/features/ee/common/server/checkLicense";
import ImpersonationProvider from "@calcom/features/ee/impersonation/lib/ImpersonationProvider";
import { hostedCal, isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { ErrorCode, isPasswordValid, verifyPassword } from "@calcom/lib/auth";
import CalComAdapter from "@calcom/lib/auth/next-auth-custom-adapter";
import { APP_NAME, IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { defaultCookies } from "@calcom/lib/default-cookies";
import { randomString } from "@calcom/lib/random";
import rateLimit from "@calcom/lib/rateLimit";
import { serverConfig } from "@calcom/lib/serverConfig";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const providers: Provider[] = [];

if (true) {
  const emailsDir = path.resolve(process.cwd(), "..", "..", "packages/emails", "templates");
  providers.push(
    EmailProvider({
      type: "email",
      maxAge: 10 * 60 * 60, // Magic links are valid for 10 min only
      // Here we setup the sendVerificationRequest that calls the email template with the identifier (email) and token to verify.
      sendVerificationRequest: ({ identifier, url }) => {
        const originalUrl = new URL(url);
        const webappUrl = new URL(WEBAPP_URL);
        if (originalUrl.origin !== webappUrl.origin) {
          url = url.replace(originalUrl.origin, webappUrl.origin);
        }
        const emailFile = readFileSync(path.join(emailsDir, "confirm-email.html"), {
          encoding: "utf8",
        });
        const emailTemplate = Handlebars.compile(emailFile);
        transporter.sendMail({
          from: `${process.env.EMAIL_FROM}` || APP_NAME,
          to: identifier,
          subject: "Your sign-in link for " + APP_NAME,
          html: emailTemplate({
            base_url: WEBAPP_URL,
            signin_url: url,
            email: identifier,
          }),
        });
      },
    })
  );
}

// OAuth authentication providers...
if (!!process.env.APPLE_ID && process.env.APPLE_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    })
  );
}

const adapter = CalComAdapter(prisma);

export default NextAuth({
  providers,
  // @ts-expect-error PrismaClient and PromiseLike signatures differ
  adapter,
});
