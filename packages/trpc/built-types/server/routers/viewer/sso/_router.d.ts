export declare const ssoRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    get: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number | null;
        };
        output: import("@calcom/ee/sso/lib/saml").SSOConnection | null;
    }>;
    update: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number | null;
            encodedRawMetadata: string;
        };
        output: import("@boxyhq/saml-jackson").SAMLSSORecord;
    }>;
    delete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number | null;
        };
        output: void;
    }>;
    updateOIDC: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            teamId: number | null;
            clientId: string;
            clientSecret: string;
            wellKnownUrl: string;
        };
        output: import("@boxyhq/saml-jackson").OIDCSSORecord;
    }>;
}>;
