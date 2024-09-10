export declare const apiKeysRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    list: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: {
            id: string;
            userId: number;
            teamId: number | null;
            createdAt: Date;
            appId: string | null;
            note: string | null;
            expiresAt: Date | null;
            lastUsedAt: Date | null;
            hashedKey: string;
        }[];
    }>;
    findKeyOfType: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            appId?: string | undefined;
            teamId?: number | undefined;
        };
        output: {
            id: string;
            userId: number;
            teamId: number | null;
            createdAt: Date;
            appId: string | null;
            note: string | null;
            expiresAt: Date | null;
            lastUsedAt: Date | null;
            hashedKey: string;
        }[];
    }>;
    create: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            note?: string | null | undefined;
            expiresAt?: Date | null | undefined;
            neverExpires?: boolean | undefined;
            appId?: string | null | undefined;
            teamId?: number | undefined;
        };
        output: string;
    }>;
    edit: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: string;
            note?: string | null | undefined;
            expiresAt?: Date | undefined;
        };
        output: {
            id: string;
            userId: number;
            teamId: number | null;
            createdAt: Date;
            appId: string | null;
            note: string | null;
            expiresAt: Date | null;
            lastUsedAt: Date | null;
            hashedKey: string;
        };
    }>;
    delete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: string;
            eventTypeId?: number | undefined;
        };
        output: {
            id: string;
        };
    }>;
}>;
