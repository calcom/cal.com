import type { UserFromSession } from "./middlewares/sessionMiddleware";
export declare const tRPCContext: {
    _config: import("@trpc/server/unstable-core-do-not-import").RootConfig<{
        ctx: import("./createContext").InnerContext;
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
    }>;
    procedure: import("@trpc/server/unstable-core-do-not-import").ProcedureBuilder<import("./createContext").InnerContext, object, object, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker>;
    middleware: <$ContextOverrides>(fn: import("@trpc/server/unstable-core-do-not-import").MiddlewareFunction<import("./createContext").InnerContext, object, object, $ContextOverrides, unknown>) => import("@trpc/server/unstable-core-do-not-import").MiddlewareBuilder<import("./createContext").InnerContext, object, $ContextOverrides, unknown>;
    router: <TProcRouterRecord extends import("@trpc/server").TRPCProcedureRouterRecord>(procedures: TProcRouterRecord) => import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
        ctx: import("./createContext").InnerContext;
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
    }>, TProcRouterRecord>;
    mergeRouters: typeof import("@trpc/server/unstable-core-do-not-import").mergeRouters;
    createCallerFactory: <TRouter extends import("@trpc/server/unstable-core-do-not-import").Router<import("@trpc/server/unstable-core-do-not-import").AnyRouterDef<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
        ctx: import("./createContext").InnerContext;
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
    }>>>>(router: TRouter) => import("@trpc/server/unstable-core-do-not-import").RouterCaller<TRouter["_def"]>;
};
export declare const router: <TProcRouterRecord extends import("@trpc/server").TRPCProcedureRouterRecord>(procedures: TProcRouterRecord) => import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
    ctx: import("./createContext").InnerContext;
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
}>, TProcRouterRecord>;
export declare const mergeRouters: typeof import("@trpc/server/unstable-core-do-not-import").mergeRouters;
export declare const middleware: <$ContextOverrides>(fn: import("@trpc/server/unstable-core-do-not-import").MiddlewareFunction<import("./createContext").InnerContext, object, object, $ContextOverrides, unknown>) => import("@trpc/server/unstable-core-do-not-import").MiddlewareBuilder<import("./createContext").InnerContext, object, $ContextOverrides, unknown>;
export declare const procedure: import("@trpc/server/unstable-core-do-not-import").ProcedureBuilder<import("./createContext").InnerContext, object, object, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/unstable-core-do-not-import").unsetMarker>;
export type TrpcSessionUser = UserFromSession;
/**
 * This function will import the module defined in importer just once and then cache the default export of that module.
 *
 * It gives you the default export of the module.
 *
 * **Note: It is your job to ensure that the name provided is unique across all routes.**
 * @example
 * ```ts
const handler = await importHandler("myUniqueNameSpace", () => import("./getUser.handler"));
return handler({ ctx, input });
 * ```
 */
export declare const importHandler: <T extends {
    default: Function;
}>(name: string, importer: () => Promise<T>) => Promise<T["default"]>;
