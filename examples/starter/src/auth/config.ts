import { PrismaAdapter } from '@auth/prisma-adapter'
import type { DefaultSession, NextAuthConfig } from 'next-auth'
import { db } from "prisma/client"

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      username: string
    }
  }
}

export const authConfig = {
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  providers: [],
  pages: { signIn: '/signup' },
  callbacks: {
    signIn: async ({ user }) => {
      if (user.id) {
        return true
      }
      return false
    },
    session: async ({ session, token, user: _ }) => {
      if (token?.sub) {
        session.user.id = token.sub
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      const isOnSignup = nextUrl.pathname.startsWith('/signup');
      if (isOnSignup) {
        if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl));
        return true;
      }
      return true;
    },

  },
} satisfies NextAuthConfig