import NextAuth from "next-auth";

import { getOptions } from "@calcom/features/auth/lib/next-auth-options";

// pass req to NextAuth: https://github.com/nextauthjs/next-auth/discussions/469
const handler = (req, res) => NextAuth(req, res, getOptions(req));

export default handler;
