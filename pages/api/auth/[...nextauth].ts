import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import NextAuth, { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";

// FIXME: not working when importing prisma directly from our project
// import prisma from "@calcom/prisma";
const prisma = new PrismaClient();

// TODO: get rid of this and do it in it's own auth.cal.com project with a custom Next.js app

export const authOptions: NextAuthOptions = {
  // For more information on each option (and a full list of options) go to
  // https://next-auth.js.org/configuration/options
  adapter: PrismaAdapter(prisma),
  // https://next-auth.js.org/configuration/providers
  providers: [
    EmailProvider({
      maxAge: 10 * 60 * 60, // Magic links are valid for 10 min only
      // sendVerificationRequest,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    // Use JSON Web Tokens for session instead of database sessions.
    // This option can be used with or without a database for users/accounts.
    // Note: `strategy` should be set to 'jwt' if no database is used.

    // TODO: Do we want to move 'database' sessions at some point?
    strategy: "jwt",
    // Seconds - How long until an idle session expires and is no longer valid.
    // maxAge: 30 * 24 * 60 * 60, // 30 days

    // Seconds - Throttle how frequently to write to database to extend a session.
    // Use it to limit write operations. Set to 0 to always update the database.
    // Note: This option is ignored if using JSON Web Tokens
    // updateAge: 24 * 60 * 60, // 24 hours
  },

  // JSON Web tokens are only used for sessions if the `strategy: 'jwt'` session
  // option is set - or by default if no database is specified.
  // https://next-auth.js.org/configuration/options#jwt
  jwt: {
    // A secret to use for key generation (you should set this explicitly)
    secret: process.env.SECRET,
    // Set to true to use encryption (default: false)
    // encryption: true,
    // You can define your own encode/decode functions for signing and encryption
    // if you want to override the default behaviour.
    // encode: async ({ secret, token, maxAge }) => {},
    // decode: async ({ secret, token, maxAge }) => {},
  },
  // https://next-auth.js.org/configuration/pages
  // NOTE: We don't want to enable these, only the API endpoints for auth. We will get rid of this when we do auth.cal.com
  pages: {
    signIn: "/", // Displays signin buttons
    signOut: "/", // Displays form with sign out button
    error: "/", // Error code passed in query string as ?error=
    verifyRequest: "/", // Used for check email page
    newUser: "/", // If set, new users will be directed here on first sign in
  },

  // Callbacks are asynchronous functions you can use to control what happens
  // when an action is performed.
  // https://next-auth.js.org/configuration/callbacks

  callbacks: {
    // async signIn({ user, account, profile, email, credentials }) { return true },
    // async redirect({ url, baseUrl }) { return baseUrl },
    // async session({ session, token, user }) { return session },
    // FIXME: add a custom jwt callback, that is stored outside next-auth
    // and can be reused to generate valid Personal Access Tokens for the API.
    // async jwt({ token, user, account, profile, isNewUser }) { return token }
  },

  // Events are useful for logging
  // https://next-auth.js.org/configuration/events

  // Enable debug messages in the console if you are having problems
  debug: false,
};
export default NextAuth(authOptions);
