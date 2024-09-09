import type { Session } from "next-auth";
type Credentials = Record<"username" | "teamId" | "returnToId", string> | undefined;
export declare function parseTeamId(creds: Partial<Credentials>): number | undefined;
export declare function checkSelfImpersonation(session: Session | null, creds: Partial<Credentials>): void;
export declare function checkUserIdentifier(creds: Partial<Credentials>): void;
export declare function checkGlobalPermission(session: Session | null): void;
declare const ImpersonationProvider: import("next-auth/providers/credentials").CredentialsConfig<{
    username: {
        type: string;
    };
    teamId: {
        type: string;
    };
    returnToId: {
        type: string;
    };
}>;
export default ImpersonationProvider;
//# sourceMappingURL=ImpersonationProvider.d.ts.map