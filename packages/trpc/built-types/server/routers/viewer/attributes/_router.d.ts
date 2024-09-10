export declare const attributesRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
        output: ({
            options: {
                value: string;
                id: string;
                slug: string;
                attributeId: string;
            }[];
        } & {
            type: import(".prisma/client").$Enums.AttributeType;
            id: string;
            slug: string;
            teamId: number;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            enabled: boolean;
            usersCanEditRelation: boolean;
        })[];
    }>;
    get: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            id: string;
        };
        output: {
            options: {
                value: string;
                id?: string | undefined;
                assignedUsers?: number | undefined;
            }[];
            type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
            id: string;
            name: string;
        };
    }>;
    getByUserId: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            userId: number;
        };
        output: {
            id: string;
            name: string;
            type: import("@calcom/prisma/enums").AttributeType;
            options: {
                id: string;
                slug: string;
                value: string;
            }[];
        }[];
    }>;
    create: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            options: {
                value: string;
            }[];
            type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
            name: string;
        };
        output: {
            id: string;
            teamId: number;
            type: import(".prisma/client").$Enums.AttributeType;
            name: string;
            slug: string;
            enabled: boolean;
            usersCanEditRelation: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    edit: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            options: {
                value: string;
                id?: string | undefined;
            }[];
            type: "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT";
            name: string;
            attributeId: string;
        };
        output: {
            id: string;
        };
    }>;
    delete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: string;
        };
        output: {
            type: import(".prisma/client").$Enums.AttributeType;
            id: string;
            slug: string;
            teamId: number;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            enabled: boolean;
            usersCanEditRelation: boolean;
        };
    }>;
    toggleActive: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            attributeId: string;
        };
        output: {
            enabled: boolean;
            id: string;
        };
    }>;
    assignUserToAttribute: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            userId: number;
            attributes: {
                id: string;
                options?: {
                    value: string;
                    label?: string | undefined;
                }[] | undefined;
                value?: string | undefined;
            }[];
        };
        output: {
            success: boolean;
            message: string;
        };
    }>;
}>;
