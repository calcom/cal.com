export type UseScheduleWithCacheArgs = {
    username?: string | null;
    eventSlug?: string | null;
    eventId?: number | null;
    month?: string | null;
    timezone?: string | null;
    selectedDate?: string | null;
    prefetchNextMonth?: boolean;
    duration?: number | null;
    monthCount?: number | null;
    dayCount?: number | null;
    rescheduleUid?: string | null;
    isTeamEvent?: boolean;
    orgSlug?: string;
    teamMemberEmail?: string | null;
};
export declare const useSchedule: ({ month, timezone, username, eventSlug, eventId, selectedDate, prefetchNextMonth, duration, monthCount, dayCount, rescheduleUid, isTeamEvent, orgSlug, teamMemberEmail, }: UseScheduleWithCacheArgs) => import("@trpc/react-query/shared").UseTRPCQueryResult<import("@calcom/trpc/server/routers/viewer/slots/util").IGetAvailableSlots, import("@calcom/trpc/react").TRPCClientErrorLike<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
}>>>;
//# sourceMappingURL=useSchedule.d.ts.map