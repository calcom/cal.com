export declare function findTokenByToken({ token }: {
    token: string;
}): Promise<{
    id: number;
    teamId: number | null;
    expires: Date;
}>;
export declare function throwIfTokenExpired(expires?: Date): void;
export declare function validateAndGetCorrectedUsernameForTeam({ username, email, teamId, isSignup, }: {
    username: string;
    email: string;
    teamId: number | null;
    isSignup: boolean;
}): Promise<string>;
//# sourceMappingURL=token.d.ts.map