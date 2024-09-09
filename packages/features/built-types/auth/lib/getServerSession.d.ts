import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { AuthOptions, Session } from "next-auth";
/**
 * This is a slimmed down version of the `getServerSession` function from
 * `next-auth`.
 *
 * Instead of requiring the entire options object for NextAuth, we create
 * a compatible session using information from the incoming token.
 *
 * The downside to this is that we won't refresh sessions if the users
 * token has expired (30 days). This should be fine as we call `/auth/session`
 * frequently enough on the client-side to keep the session alive.
 */
export declare function getServerSession(options: {
    req: NextApiRequest | GetServerSidePropsContext["req"];
    res?: NextApiResponse | GetServerSidePropsContext["res"];
    authOptions?: AuthOptions;
}): Promise<Session | null>;
//# sourceMappingURL=getServerSession.d.ts.map