export declare const webhookRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
        input: {
            id?: string | undefined;
            eventTypeId?: number | undefined;
            teamId?: number | undefined;
            appId?: string | undefined;
            eventTriggers?: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[] | undefined;
        } | undefined;
        output: {
            id: string;
            userId: number | null;
            eventTypeId: number | null;
            createdAt: Date;
            teamId: number | null;
            secret: string | null;
            appId: string | null;
            platformOAuthClientId: string | null;
            subscriberUrl: string;
            payloadTemplate: string | null;
            active: boolean;
            eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
            platform: boolean;
        }[];
    }>;
    get: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            id?: string | undefined;
            eventTypeId?: number | undefined;
            teamId?: number | undefined;
            webhookId?: string | undefined;
        };
        output: {
            id: string;
            userId: number | null;
            teamId: number | null;
            secret: string | null;
            subscriberUrl: string;
            payloadTemplate: string | null;
            active: boolean;
            eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
            platform: boolean;
        };
    }>;
    create: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id?: string | undefined;
            eventTypeId?: number | undefined;
            teamId?: number | undefined;
            subscriberUrl: string;
            payloadTemplate: string | null;
            active: boolean;
            eventTriggers: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[];
            appId?: string | null | undefined;
            secret?: string | null | undefined;
            platform?: boolean | undefined;
        };
        output: {
            id: string;
            userId: number | null;
            teamId: number | null;
            eventTypeId: number | null;
            platformOAuthClientId: string | null;
            subscriberUrl: string;
            payloadTemplate: string | null;
            createdAt: Date;
            active: boolean;
            eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
            appId: string | null;
            secret: string | null;
            platform: boolean;
        };
    }>;
    edit: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: string;
            eventTypeId?: number | undefined;
            teamId?: number | undefined;
            payloadTemplate: string | null;
            subscriberUrl?: string | undefined;
            eventTriggers?: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[] | undefined;
            active?: boolean | undefined;
            appId?: string | null | undefined;
            secret?: string | null | undefined;
        };
        output: {
            id: string;
            userId: number | null;
            eventTypeId: number | null;
            createdAt: Date;
            teamId: number | null;
            secret: string | null;
            appId: string | null;
            platformOAuthClientId: string | null;
            subscriberUrl: string;
            payloadTemplate: string | null;
            active: boolean;
            eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
            platform: boolean;
        } | null;
    }>;
    delete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id: string;
            eventTypeId?: number | undefined;
            teamId?: number | undefined;
        };
        output: {
            id: string;
        };
    }>;
    testTrigger: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            id?: string | undefined;
            eventTypeId?: number | undefined;
            teamId?: number | undefined;
            type: string;
            url: string;
            secret?: string | undefined;
            payloadTemplate?: string | null | undefined;
        };
        output: {
            message?: string | undefined;
            ok: boolean;
            status: number;
        };
    }>;
    getByViewer: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            id?: string | undefined;
            eventTypeId?: number | undefined;
            teamId?: number | undefined;
        } | undefined;
        output: {
            webhookGroups: {
                teamId?: number | null | undefined;
                profile: {
                    slug: string | null;
                    name: string | null;
                    image?: string | undefined;
                };
                metadata?: {
                    readOnly: boolean;
                } | undefined;
                webhooks: {
                    id: string;
                    userId: number | null;
                    teamId: number | null;
                    eventTypeId: number | null;
                    platformOAuthClientId: string | null;
                    subscriberUrl: string;
                    payloadTemplate: string | null;
                    createdAt: Date;
                    active: boolean;
                    eventTriggers: import(".prisma/client").$Enums.WebhookTriggerEvents[];
                    appId: string | null;
                    secret: string | null;
                    platform: boolean;
                }[];
            }[];
            profiles: {
                readOnly?: boolean | undefined;
                slug: string | null;
                name: string | null;
                image?: string | undefined;
                teamId: number | null | undefined;
            }[];
        };
    }>;
}>;
