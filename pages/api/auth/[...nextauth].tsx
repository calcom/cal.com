import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { verifyPassword } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

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
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error("No user found");
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
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async jwt(token, user, account, profile, isNewUser) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session(session, token) {
      session.user = session.user || {};
      session.user.id = token.id;
      return session;
    },
  },
});
