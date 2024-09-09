export declare const adminRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
    ctx: import("../../../createContext").InnerContext;
    meta: object;
    errorShape: import("@trpc/server/unstable-core-do-not-import").DefaultErrorShape;
    transformer: {
        stringify: (object: any) => string;
        parse: <T = unknown>(string: string) => T;
        serialize: (object: any) => import("superjson/dist/types").SuperJSONResult;
        deserialize: <T_1 = unknown>(payload: import("superjson/dist/types").SuperJSONResult) => T_1;
        registerClass: (v: import("superjson/dist/types").Class, options?: string | import("superjson/dist/class-registry").RegisterOptions | undefined) => void;
        registerSymbol: (v: Symbol, identifier?: string | undefined) => void;
        registerCustom: <I, O extends import("superjson/dist/types").JSONValue>(transformer: Omit<import("superjson/dist/custom-transformer-registry").CustomTransfomer<I, O>, "name">, name: string) => void;
        allowErrorProps: (...props: string[]) => void;
    };
}>, {
    listPaginated: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            limit: number;
            cursor?: number | null | undefined;
            searchTerm?: string | null | undefined;
        };
        output: {
            rows: {
                name: string | null;
                id: number;
                email: string;
                timeZone: string;
                username: string | null;
                role: import(".prisma/client").$Enums.UserPermissionRole;
                locked: boolean;
            }[];
            nextCursor: number | undefined;
            meta: {
                totalRowCount: number;
            };
        };
    }>;
    sendPasswordReset: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userId: number;
        };
        output: {
            success: boolean;
        };
    }>;
    lockUserAccount: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userId: number;
            locked: boolean;
        };
        output: {
            success: boolean;
            userId: number;
            locked: boolean;
        };
    }>;
    toggleFeatureFlag: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            slug: string;
            enabled: boolean;
        };
        output: {
            type: import(".prisma/client").$Enums.FeatureType | null;
            description: string | null;
            createdAt: Date | null;
            updatedAt: Date | null;
            slug: string;
            enabled: boolean;
            lastUsedAt: Date | null;
            stale: boolean | null;
            updatedBy: number | null;
        };
    }>;
    removeTwoFactor: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userId: number;
        };
        output: {
            success: boolean;
            userId: number;
        };
    }>;
    getSMSLockStateTeamsUsers: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            users: {
                locked: {
                    name: string | null;
                    id: number;
                    email: string;
                    smsLockState: import(".prisma/client").$Enums.SMSLockState;
                    username: string | null;
                    avatarUrl: string | null;
                }[];
                reviewNeeded: {
                    name: string | null;
                    id: number;
                    email: string;
                    smsLockState: import(".prisma/client").$Enums.SMSLockState;
                    username: string | null;
                    avatarUrl: string | null;
                }[];
            };
            teams: {
                locked: {
                    name: string;
                    id: number;
                    slug: string | null;
                    logoUrl: string | null;
                    smsLockState: import(".prisma/client").$Enums.SMSLockState;
                }[];
                reviewNeeded: {
                    name: string;
                    id: number;
                    slug: string | null;
                    logoUrl: string | null;
                    smsLockState: import(".prisma/client").$Enums.SMSLockState;
                }[];
            };
        };
    }>;
    setSMSLockState: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userId?: number | undefined;
            username?: string | undefined;
            teamId?: number | undefined;
            teamSlug?: string | undefined;
            lock?: boolean | undefined;
        };
        output: {
            name: string | null;
            locked: boolean | undefined;
        };
    }>;
    createSelfHostedLicense: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            billingPeriod: "MONTHLY" | "ANNUALLY";
            billingType: "PER_BOOKING" | "PER_USER";
            entityCount: number;
            entityPrice: number;
            overages: number;
            billingEmail: string;
        };
        output: {
            stripeCheckoutUrl: string;
        };
    }>;
}>;
