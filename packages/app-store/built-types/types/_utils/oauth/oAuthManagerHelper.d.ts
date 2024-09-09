import { getTokenObjectFromCredential } from "./getTokenObjectFromCredential";
export declare const credentialSyncVariables: {
    APP_CREDENTIAL_SHARING_ENABLED: boolean;
    CREDENTIAL_SYNC_ENDPOINT: string | undefined;
    CREDENTIAL_SYNC_SECRET: string | undefined;
    CREDENTIAL_SYNC_SECRET_HEADER_NAME: string;
};
export declare const oAuthManagerHelper: {
    updateTokenObject: ({ tokenObject, credentialId, }: {
        tokenObject: import("zod").objectOutputType<{
            refresh_token: import("zod").ZodOptional<import("zod").ZodString>;
            access_token: import("zod").ZodString;
            token_type: import("zod").ZodOptional<import("zod").ZodString>;
            scope: import("zod").ZodOptional<import("zod").ZodString>;
            expiry_date: import("zod").ZodOptional<import("zod").ZodNumber>;
            expires_in: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, import("zod").ZodTypeAny, "passthrough">;
        credentialId: number;
    }) => Promise<void>;
    markTokenAsExpired: (credential: {
        type: string;
        id: number;
        invalid: boolean | null;
        key: import(".prisma/client").Prisma.JsonValue;
        user: {
            email: string;
        } | null;
        userId: number | null;
        teamId: number | null;
        appId: string | null;
    }) => Promise<void>;
    invalidateCredential: (credentialId: number) => Promise<void>;
    getTokenObjectFromCredential: typeof getTokenObjectFromCredential;
    credentialSyncVariables: {
        APP_CREDENTIAL_SHARING_ENABLED: boolean;
        CREDENTIAL_SYNC_ENDPOINT: string | undefined;
        CREDENTIAL_SYNC_SECRET: string | undefined;
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: string;
    };
};
//# sourceMappingURL=oAuthManagerHelper.d.ts.map