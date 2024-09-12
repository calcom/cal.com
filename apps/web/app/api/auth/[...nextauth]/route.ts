import NextAuth from "next-auth";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";

const handler = NextAuth(AUTH_OPTIONS);

export { handler as GET, handler as POST };
