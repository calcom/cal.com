export declare const appsRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    listLocal: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            category: string;
        };
        output: ({
            name: string;
            slug: string;
            logo: string;
            title: string | undefined;
            type: `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_other` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
            description: string;
            keys: import(".prisma/client").Prisma.JsonObject | null;
            dirName: string;
            enabled: boolean;
            isTemplate: boolean | undefined;
        } | {
            name: string;
            slug: string;
            logo: string;
            type: `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_other` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar`;
            title: string | undefined;
            description: string;
            enabled: boolean;
            dirName: string;
            keys: Record<string, string> | null;
            isTemplate?: undefined;
        })[];
    }>;
    toggle: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            slug: string;
            enabled: boolean;
        };
        output: boolean;
    }>;
    saveKeys: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            type: string;
            slug: string;
            dirName: string;
            keys?: unknown;
            fromEnabled?: boolean | undefined;
        };
        output: void;
    }>;
    checkForGCal: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: boolean;
    }>;
    setDefaultConferencingApp: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            slug: string;
        };
        output: void;
    }>;
    updateAppCredentials: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            credentialId: number;
            key: {} & {
                [k: string]: unknown;
            };
        };
        output: boolean;
    }>;
    queryForDependencies: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: string[] | undefined;
        output: {
            name: string;
            slug: string;
            installed: boolean;
        }[] | undefined;
    }>;
    checkGlobalKeys: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            slug: string;
        };
        output: boolean;
    }>;
}>;
