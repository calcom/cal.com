/** This should be called getAvailableSlots */
export declare const slotsRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    getSchedule: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startTime: string;
            endTime: string;
            eventTypeId?: number | undefined;
            eventTypeSlug?: string | undefined;
            timeZone?: string | undefined;
            usernameList?: string[] | undefined;
            debug?: boolean | undefined;
            duration?: string | undefined;
            rescheduleUid?: string | null | undefined;
            isTeamEvent?: boolean | undefined;
            orgSlug?: string | undefined;
            teamMemberEmail?: string | null | undefined;
        };
        output: import("./util").IGetAvailableSlots;
    }>;
    reserveSlot: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            eventTypeId: number;
            slotUtcStartDate: string;
            slotUtcEndDate: string;
            bookingUid?: string | undefined;
        };
        output: {
            uid: string;
        };
    }>;
    removeSelectedSlotMark: import("@trpc/server/unstable-core-do-not-import").MutationProcedure<{
        input: {
            uid: string | null;
        };
        output: void;
    }>;
}>;
