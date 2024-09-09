import type { NextApiRequest } from "next";
export declare function validateAccountOrApiKey(req: NextApiRequest, requiredScopes?: string[]): Promise<{
    account: {
        id: number;
        name: string | null;
        isTeam: boolean;
    };
    appApiKey: undefined;
} | {
    account: null;
    appApiKey: {
        id: string;
        userId: number;
        createdAt: Date;
        teamId: number | null;
        appId: string | null;
        note: string | null;
        expiresAt: Date | null;
        lastUsedAt: Date | null;
        hashedKey: string;
    };
}>;
//# sourceMappingURL=validateAccountOrApiKey.d.ts.map