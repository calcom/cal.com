export declare const platformMe: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
    input: void;
    output: {
        id: number;
        username: string | null;
        email: string;
        timeFormat: number | null;
        timeZone: string;
        defaultScheduleId: number | null;
        weekStart: string;
        organizationId: number | null;
        organization: {
            isPlatform: any;
            id: number | null;
        };
    };
}>;
