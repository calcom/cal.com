import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import prisma from "../../../lib/prisma";
import { Session, verifyPassword } from "../../../lib/auth";

export default NextAuth({
  session: {
    jwt: true,
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error", // Error code passed in query string as ?error=
  },
  providers: [
    Providers.Credentials({
      name: "Calendso",
      credentials: {
        email: { label: "Email Address", type: "email", placeholder: "john.doe@example.com" },
        password: { label: "Password", type: "password", placeholder: "Your super secure password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error("No user found");
        }
        if (!user.password) {
          throw new Error("Incorrect password");
        }

        const isValid = await verifyPassword(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Incorrect password");
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          locale: user.locale,
        };
      },
    }),
  ],
  callbacks: {
    async jwt(token, user) {
      // If we update the user username/locale
      // the token is not updated with the
      // updated username/locale (only after signing in again)
      // If session exists, update with the right value
      if (!user && token.id) {
        const currentUser = await prisma.user.findUnique({
          where: {
            id: token.id,
          },
        });
        if (currentUser) {
          token.id = currentUser.id;
          token.username = currentUser.username;
          token.locale = currentUser.locale;
        }
      }

      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.locale = user.locale;
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
          locale: token.locale as string,
        },
      };
      return calendsoSession;
    },
  },
});
