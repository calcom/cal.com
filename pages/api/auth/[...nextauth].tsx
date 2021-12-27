import jwt from "jsonwebtoken";
import NextAuth from "next-auth";
import { JWT, JWTDecodeParams, JWTEncodeParams } from "next-auth/jwt";
import Providers from "next-auth/providers";
import { authenticator } from "otplib";

import { ErrorCode, Session, verifyPassword } from "@lib/auth";
import { symmetricDecrypt } from "@lib/crypto";
import prisma from "@lib/prisma";

const isSecureEnvironment = ["production", "staging"].includes(process.env.NODE_ENV || "production");

const { hostname } = new URL(process.env.NEXTAUTH_URL || "");

export default NextAuth({
  session: {
    // Use JSON Web Tokens for session instead of database sessions.
    // This option can be used with or without a database for users/accounts.
    // Note: `jwt` is automatically set to `true` if no database is specified.
    jwt: true,

    // Seconds - How long until an idle session expires and is no longer valid.
    maxAge: 30 * 24 * 60 * 60, // 30 days

    // Seconds - Throttle how frequently to write to database to extend a session.
    // Use it to limit write operations. Set to 0 to always update the database.
    // Note: This option is ignored if using JSON Web Tokens
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    async encode(params?: JWTEncodeParams) {
      const { secret, token } = params || {};
      return jwt.sign(token || {}, secret || process.env.JWT_SECRET || "") as string;
    },
    async decode(params?: JWTDecodeParams) {
      const { secret, token } = params || {};
      const decodedToken = jwt.verify(token || "", secret || process.env.JWT_SECRET || "") as JWT;

      if (!decodedToken?.email) {
        console.error(`"Thetis user could not be found or created due to missing decoded email."`);
        throw new Error(ErrorCode.InternalServerError);
      }

      if (!decodedToken?.hasProductType1on1) {
        console.error(
          `"Thetis user: ${decodedToken?.email?.toLowerCase()} does not have active Product of type 1-on-1"`
        );
        throw new Error(ErrorCode.UserNotFoundWithActiveProductType);
      }

      let user;

      if (decodedToken?.email) {
        user = await prisma.user.upsert({
          where: {
            email: decodedToken?.email?.toLowerCase(),
          },
          update: {
            hideBranding: true,
            thetisId: decodedToken?.userId as string,
          },
          create: {
            hideBranding: true,
            email: decodedToken?.email?.toLowerCase(),
            thetisId: decodedToken?.userId as string,
            username: decodedToken?.instructorProfileHandle as string,
            name: decodedToken?.instructorProfilePublicName as string,
          },
        });
      }

      if (!user) {
        console.error(`"Thetis user: ${decodedToken?.email?.toLowerCase()} could not be found or created."`);
        throw new Error(ErrorCode.InternalServerError);
      }

      decodedToken.id = user.id;
      return decodedToken;
    },
  },
  cookies: {
    sessionToken: {
      name: `${isSecureEnvironment ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        domain: isSecureEnvironment
          ? hostname.includes(".theskills.com")
            ? ".theskills.com"
            : hostname
          : undefined,
        path: "/",
        httpOnly: true,
        secure: isSecureEnvironment,
        sameSite: "lax",
      },
    },
  },
  debug: process.env.NODE_ENV !== "production",
  pages: {
    signIn: "https://theskills.com/sign-in",
    signOut: "/auth/logout",
    error: "/auth/error", // Error code passed in query string as ?error=
  },
  providers: [
    Providers.Credentials({
      name: "Cal.com",
      credentials: {
        email: { label: "Email Address", type: "email", placeholder: "john.doe@example.com" },
        password: { label: "Password", type: "password", placeholder: "Your super secure password" },
        totpCode: { label: "Two-factor Code", type: "input", placeholder: "Code from authenticator app" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase(),
          },
        });

        if (!user) {
          throw new Error(ErrorCode.UserNotFound);
        }

        if (!user.password) {
          throw new Error(ErrorCode.UserMissingPassword);
        }

        const isCorrectPassword = await verifyPassword(credentials.password, user.password);
        if (!isCorrectPassword) {
          throw new Error(ErrorCode.IncorrectPassword);
        }

        if (user.twoFactorEnabled) {
          if (!credentials.totpCode) {
            throw new Error(ErrorCode.SecondFactorRequired);
          }

          if (!user.twoFactorSecret) {
            console.error(`Two factor is enabled for user ${user.id} but they have no secret`);
            throw new Error(ErrorCode.InternalServerError);
          }

          if (!process.env.CALENDSO_ENCRYPTION_KEY) {
            console.error(`"Missing encryption key; cannot proceed with two factor login."`);
            throw new Error(ErrorCode.InternalServerError);
          }

          const secret = symmetricDecrypt(user.twoFactorSecret, process.env.CALENDSO_ENCRYPTION_KEY);
          if (secret.length !== 32) {
            console.error(
              `Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`
            );
            throw new Error(ErrorCode.InternalServerError);
          }

          const isValidToken = authenticator.check(credentials.totpCode, secret);
          if (!isValidToken) {
            throw new Error(ErrorCode.IncorrectTwoFactorCode);
          }
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async redirect(url, baseUrl) {
      if (process.env.THETIS_SITE_HOST && url.startsWith(process.env.THETIS_SITE_HOST)) {
        return url;
      } else {
        return baseUrl;
      }
    },
    async jwt(token, user) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
    },
    async session(session, token) {
      const calendsoSession: Session = {
        ...session,
        user: {
          ...session.user,
          id: token.id as number,
          username: token.username as string,
        },
      };
      return calendsoSession;
    },
  },
});
