export declare const featureFlagRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
    ctx: import("@calcom/trpc/server/createContext").InnerContext;
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
            type: import(".prisma/client").$Enums.FeatureType | null;
            description: string | null;
            slug: string;
            createdAt: Date | null;
            updatedAt: Date | null;
            enabled: boolean;
            lastUsedAt: Date | null;
            stale: boolean | null;
            updatedBy: number | null;
        }[];
    }>;
    map: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: Partial<import("../config").AppFlags>;
    }>;
}>;
//# sourceMappingURL=router.d.ts.map