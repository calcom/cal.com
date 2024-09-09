export declare const paymentsRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
    ctx: import("../../createContext").InnerContext;
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
    chargeCard: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            bookingId: number;
        };
        output: {
            id: number;
            uid: string;
            appId: string | null;
            bookingId: number;
            amount: number;
            fee: number;
            currency: string;
            success: boolean;
            refunded: boolean;
            data: import(".prisma/client").Prisma.JsonValue;
            externalId: string;
            paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
        };
    }>;
}>;
