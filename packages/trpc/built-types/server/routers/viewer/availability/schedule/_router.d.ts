export declare const scheduleRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
    ctx: import("../../../../createContext").InnerContext;
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
            scheduleId?: number | undefined;
            isManagedEventType?: boolean | undefined;
        };
        output: {
            id: number;
            name: string;
            isManaged: boolean;
            workingHours: import("@calcom/types/schedule").WorkingHours[];
            schedule: {
                id: number;
                userId: number | null;
                eventTypeId: number | null;
                startTime: Date;
                endTime: Date;
                scheduleId: number | null;
                days: number[];
                date: Date | null;
            }[];
            availability: {
                end: Date;
                userId?: number | null | undefined;
                start: Date;
            }[][];
            timeZone: string;
            dateOverrides: {
                ranges: import("@calcom/types/schedule").TimeRange[];
            }[];
            isDefault: boolean;
            isLastSchedule: boolean;
            readOnly: boolean;
        };
    }>;
    create: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            name: string;
            schedule?: {
                end: Date;
                start: Date;
            }[][] | undefined;
            eventTypeId?: number | undefined;
        };
        output: {
            schedule: {
                name: string;
                id: number;
                userId: number;
                timeZone: string | null;
            };
        };
    }>;
    delete: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            scheduleId: number;
        };
        output: void;
    }>;
    update: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            scheduleId: number;
            timeZone?: string | undefined;
            name?: string | undefined;
            isDefault?: boolean | undefined;
            schedule?: {
                end: Date;
                start: Date;
            }[][] | undefined;
            dateOverrides?: {
                end: Date;
                start: Date;
            }[] | undefined;
        };
        output: {
            schedule: {
                name: string;
                id: number;
                userId: number;
            };
            isDefault: boolean;
            availability?: undefined;
            timeZone?: undefined;
            prevDefaultId?: undefined;
            currentDefaultId?: undefined;
        } | {
            schedule: {
                eventType: {
                    id: number;
                    eventName: string | null;
                }[];
                availability: {
                    id: number;
                    userId: number | null;
                    eventTypeId: number | null;
                    startTime: Date;
                    endTime: Date;
                    scheduleId: number | null;
                    days: number[];
                    date: Date | null;
                }[];
                name: string;
                id: number;
                userId: number;
                timeZone: string | null;
            };
            availability: import("@calcom/types/schedule").Schedule;
            timeZone: string;
            isDefault: boolean;
            prevDefaultId: number | null;
            currentDefaultId: number | null;
        };
    }>;
    duplicate: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            scheduleId: number;
        };
        output: {
            schedule: {
                name: string;
                id: number;
                userId: number;
                timeZone: string | null;
            };
        };
    }>;
    getScheduleByUserId: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            userId?: number | undefined;
        };
        output: {
            hasDefaultSchedule: boolean;
            id: number;
            name: string;
            isManaged: boolean;
            workingHours: import("@calcom/types/schedule").WorkingHours[];
            schedule: {
                id: number;
                userId: number | null;
                eventTypeId: number | null;
                startTime: Date;
                endTime: Date;
                scheduleId: number | null;
                days: number[];
                date: Date | null;
            }[];
            availability: {
                end: Date;
                userId?: number | null | undefined;
                start: Date;
            }[][];
            timeZone: string;
            dateOverrides: {
                ranges: import("@calcom/types/schedule").TimeRange[];
            }[];
            isDefault: boolean;
            isLastSchedule: boolean;
            readOnly: boolean;
        } | {
            id: number;
            name: string;
            availability: never[][];
            dateOverrides: never[];
            timeZone: string;
            workingHours: never[];
            isDefault: boolean;
            hasDefaultSchedule: boolean;
        };
    }>;
    getScheduleByEventSlug: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            eventSlug: string;
        };
        output: {
            id: number;
            name: string;
            isManaged: boolean;
            workingHours: import("@calcom/types/schedule").WorkingHours[];
            schedule: {
                id: number;
                userId: number | null;
                eventTypeId: number | null;
                startTime: Date;
                endTime: Date;
                scheduleId: number | null;
                days: number[];
                date: Date | null;
            }[];
            availability: {
                end: Date;
                userId?: number | null | undefined;
                start: Date;
            }[][];
            timeZone: string;
            dateOverrides: {
                ranges: import("@calcom/types/schedule").TimeRange[];
            }[];
            isDefault: boolean;
            isLastSchedule: boolean;
            readOnly: boolean;
        } | {
            id: number;
            name: string;
            availability: never[][];
            dateOverrides: never[];
            timeZone: string;
            workingHours: never[];
            isDefault: boolean;
        };
    }>;
    bulkUpdateToDefaultAvailability: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            eventTypeIds: number[];
        };
        output: import("@prisma/client/runtime/library").GetBatchResult;
    }>;
}>;
