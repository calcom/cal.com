import type { Membership, Team } from "@prisma/client";
import type { AuthOptions } from "next-auth";
type UserTeams = {
    teams: (Membership & {
        team: Pick<Team, "metadata">;
    })[];
};
export declare const checkIfUserBelongsToActiveTeam: <T extends UserTeams>(user: T) => boolean;
export declare const AUTH_OPTIONS: AuthOptions;
export {};
//# sourceMappingURL=next-auth-options.d.ts.map