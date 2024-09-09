export declare const oAuthRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    getClient: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            clientId: string;
        };
        output: {
            name: string;
            logo: string | null;
            clientId: string;
            redirectUri: string;
        } | null;
    }>;
    addClient: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            name: string;
            logo: string;
            redirectUri: string;
        };
        output: {
            clientSecret: string;
            name: string;
            logo: string | null;
            clientId: string;
            redirectUri: string;
        };
    }>;
    generateAuthCode: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            clientId: string;
            scopes: string[];
            teamSlug?: string | undefined;
        };
        output: {
            client: {
                name: string;
                clientId: string;
                redirectUri: string;
            };
            authorizationCode: string;
        };
    }>;
}>;
