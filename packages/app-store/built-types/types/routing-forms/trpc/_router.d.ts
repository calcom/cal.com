declare const appRoutingForms: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    public: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
        response: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
            input: {
                formFillerId: string;
                formId: string;
                response: Record<string, {
                    value: (string | number | string[]) & (string | number | string[] | undefined);
                    label: string;
                }>;
            };
            output: {
                id: number;
                createdAt: Date;
                formFillerId: string;
                formId: string;
                response: import(".prisma/client").Prisma.JsonValue;
            };
        }>;
    }>;
    forms: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            filters?: {
                teamIds?: number[] | undefined;
                userIds?: number[] | undefined;
                upIds?: string[] | undefined;
            } | undefined;
        } | null | undefined;
        output: {
            filtered: {
                form: import("../types/types").SerializableForm<{
                    team: ({
                        members: {
                            id: number;
                            userId: number;
                            teamId: number;
                            role: import(".prisma/client").$Enums.MembershipRole;
                            disableImpersonation: boolean;
                            accepted: boolean;
                        }[];
                    } & {
                        id: number;
                        name: string;
                        metadata: import(".prisma/client").Prisma.JsonValue;
                        theme: string | null;
                        createdAt: Date;
                        timeZone: string;
                        slug: string | null;
                        parentId: number | null;
                        logoUrl: string | null;
                        calVideoLogo: string | null;
                        appLogo: string | null;
                        appIconLogo: string | null;
                        bio: string | null;
                        hideBranding: boolean;
                        isPrivate: boolean;
                        hideBookATeamMember: boolean;
                        brandColor: string | null;
                        darkBrandColor: string | null;
                        bannerUrl: string | null;
                        timeFormat: number | null;
                        weekStart: string;
                        isOrganization: boolean;
                        pendingPayment: boolean;
                        isPlatform: boolean;
                        createdByOAuthClientId: string | null;
                        smsLockState: import(".prisma/client").$Enums.SMSLockState;
                        smsLockReviewedByAdmin: boolean;
                    }) | null;
                    _count: {
                        responses: number;
                    };
                } & {
                    id: string;
                    name: string;
                    description: string | null;
                    routes: import(".prisma/client").Prisma.JsonValue;
                    fields: import(".prisma/client").Prisma.JsonValue;
                    position: number;
                    disabled: boolean;
                    userId: number;
                    createdAt: Date;
                    updatedAt: Date;
                    teamId: number | null;
                    settings: import(".prisma/client").Prisma.JsonValue;
                }>;
                readOnly: boolean;
            }[];
            totalCount: number;
        };
    }>;
    formQuery: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            id: string;
        };
        output: import("../types/types").SerializableForm<{
            team: {
                name: string;
                slug: string | null;
            } | null;
            _count: {
                responses: number;
            };
        } & {
            id: string;
            name: string;
            description: string | null;
            routes: import(".prisma/client").Prisma.JsonValue;
            fields: import(".prisma/client").Prisma.JsonValue;
            position: number;
            disabled: boolean;
            userId: number;
            createdAt: Date;
            updatedAt: Date;
            teamId: number | null;
            settings: import(".prisma/client").Prisma.JsonValue;
        }> | null;
    }>;
    formMutation: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: string;
            name: string;
            description?: string | null | undefined;
            disabled?: boolean | undefined;
            fields?: ({
                type: string;
                label: string;
                id: string;
                identifier?: string | undefined;
                placeholder?: string | undefined;
                selectText?: string | undefined;
                required?: boolean | undefined;
                deleted?: boolean | undefined;
                options?: {
                    label: string;
                    id: string | null;
                }[] | undefined;
            } | {
                type: string;
                label: string;
                id: string;
                routerId: string;
                options?: {
                    label: string;
                    id: string | null;
                }[] | undefined;
                identifier?: string | undefined;
                placeholder?: string | undefined;
                selectText?: string | undefined;
                required?: boolean | undefined;
                deleted?: boolean | undefined;
            })[] | undefined;
            routes?: ({
                id: string;
                queryValue: {
                    type: "group" | "switch_group";
                    id?: string | undefined;
                    children1?: any;
                    properties?: any;
                };
                action: {
                    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
                    value: string;
                };
                isFallback?: boolean | undefined;
            } | {
                id: string;
                isRouter: true;
            })[] | null | undefined;
            addFallback?: boolean | undefined;
            duplicateFrom?: string | null | undefined;
            teamId?: number | null | undefined;
            shouldConnect?: boolean | undefined;
            settings?: {
                emailOwnerOnSubmission: boolean;
                sendUpdatesTo?: number[] | undefined;
                sendToAll?: boolean | undefined;
            } | null | undefined;
        };
        output: {
            id: string;
            name: string;
            description: string | null;
            routes: import(".prisma/client").Prisma.JsonValue;
            fields: import(".prisma/client").Prisma.JsonValue;
            position: number;
            disabled: boolean;
            userId: number;
            createdAt: Date;
            updatedAt: Date;
            teamId: number | null;
            settings: import(".prisma/client").Prisma.JsonValue;
        };
    }>;
    deleteForm: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: string;
        };
        output: import("@prisma/client/runtime/library").GetBatchResult;
    }>;
    report: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            formId: string;
            jsonLogicQuery: {
                logic: Record<string, any> | null;
            };
            cursor?: number | null | undefined;
        };
        output: {
            headers: string[];
            responses: string[][];
            nextCursor: number | null;
        };
    }>;
}>;
export default appRoutingForms;
//# sourceMappingURL=_router.d.ts.map