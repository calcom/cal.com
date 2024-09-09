export declare const authRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    changePassword: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            oldPassword: string;
            newPassword: string;
        };
        output: void;
    }>;
    verifyPassword: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            passwordInput: string;
        };
        output: void;
    }>;
    verifyCodeUnAuthenticated: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            code: string;
            email: string;
        };
        output: true;
    }>;
    sendVerifyEmailCode: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            email: string;
            username?: string | undefined;
            language?: string | undefined;
            isVerifyingEmail?: boolean | undefined;
        };
        output: {
            ok: boolean;
            skipped: boolean;
        };
    }>;
    resendVerifyEmail: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            email: string;
        } | undefined;
        output: {
            ok: boolean;
            skipped: boolean;
        };
    }>;
    createAccountPassword: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: void;
        output: void;
    }>;
}>;
