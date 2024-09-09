declare const findValidApiKey: (apiKey: string, appId?: string) => Promise<{
    id: string;
    userId: number;
    teamId: number | null;
    createdAt: Date;
    appId: string | null;
    note: string | null;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    hashedKey: string;
} | null>;
export default findValidApiKey;
//# sourceMappingURL=findValidApiKey.d.ts.map