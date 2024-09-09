export interface IResultTeamList {
    id: number;
    slug: string | null;
    name: string | null;
    logoUrl: string | null;
    userId?: number;
    isOrg?: boolean;
}
export declare const insightsRouter: import("@trpc/server/unstable-core-do-not-import").CreateRouterInner<import("@trpc/server/unstable-core-do-not-import").RootConfig<{
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
    eventsByStatus: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            teamId?: number | null | undefined;
            eventTypeId?: number | undefined;
            memberUserId?: number | undefined;
            userId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            empty: boolean;
            created: {
                count: number;
                deltaPrevious: number;
            };
            completed: {
                count: number;
                deltaPrevious: number;
            };
            rescheduled: {
                count: number;
                deltaPrevious: number;
            };
            cancelled: {
                count: number;
                deltaPrevious: number;
            };
            rating: {
                count: number;
                deltaPrevious: number;
            };
            no_show: {
                count: number;
                deltaPrevious: number;
            };
            csat: {
                count: number;
                deltaPrevious: number;
            };
            previousRange: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    eventsTimeline: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            timeView: "day" | "month" | "year" | "week";
            teamId?: number | null | undefined;
            eventTypeId?: number | undefined;
            memberUserId?: number | undefined;
            userId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            Month: string;
            Created: number;
            Completed: number;
            Rescheduled: number;
            Cancelled: number;
            "No-Show (Host)": number;
        }[];
    }>;
    popularEventTypes: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            memberUserId?: number | undefined;
            teamId?: number | null | undefined;
            userId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: ({
            eventTypeId?: undefined;
            eventTypeName?: undefined;
            count?: undefined;
        } | {
            eventTypeId: number | null;
            eventTypeName: string;
            count: number;
        })[];
    }>;
    averageEventDuration: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            memberUserId?: number | undefined;
            teamId?: number | null | undefined;
            userId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            Date: string;
            Average: number;
        }[];
    }>;
    membersWithMostBookings: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            teamId?: number | null | undefined;
            eventTypeId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            userId: number | null;
            user: Omit<{
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                avatarUrl: string | null;
            }, "avatarUrl"> & {
                avatarUrl: string;
            };
            emailMd5: string;
            count: number;
        }[];
    }>;
    membersWithLeastBookings: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            teamId?: number | null | undefined;
            eventTypeId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            userId: number | null;
            user: Omit<{
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                avatarUrl: string | null;
            }, "avatarUrl"> & {
                avatarUrl: string;
            };
            emailMd5: string;
            count: number;
        }[];
    }>;
    teamListForUser: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: void;
        output: IResultTeamList[];
    }>;
    userList: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId: number | null;
            isAll: boolean | null;
        };
        output: {
            id: number;
            name: string | null;
            email: string;
            username: string | null;
            avatarUrl: string | null;
        }[];
    }>;
    eventTypeList: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            teamId?: number | null | undefined;
            userId?: number | null | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            title: string;
            id: number;
            slug: string;
            teamId: number | null;
            team: {
                name: string;
            } | null;
        }[];
    }>;
    recentRatings: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            teamId?: number | null | undefined;
            eventTypeId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            userId: number | null;
            user: Omit<{
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                avatarUrl: string | null;
            }, "avatarUrl"> & {
                avatarUrl: string;
            };
            emailMd5: string;
            rating: number | null;
            feedback: string | null;
        }[];
    }>;
    membersWithMostNoShow: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            teamId?: number | null | undefined;
            eventTypeId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            userId: number | null;
            user: Omit<{
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                avatarUrl: string | null;
            }, "avatarUrl"> & {
                avatarUrl: string;
            };
            emailMd5: string;
            count: number;
        }[];
    }>;
    membersWithHighestRatings: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            teamId?: number | null | undefined;
            eventTypeId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            userId: number | null;
            user: Omit<{
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                avatarUrl: string | null;
            }, "avatarUrl"> & {
                avatarUrl: string;
            };
            emailMd5: string;
            averageRating: number | null;
        }[];
    }>;
    membersWithLowestRatings: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            teamId?: number | null | undefined;
            eventTypeId?: number | undefined;
            isAll?: boolean | undefined;
        };
        output: {
            userId: number | null;
            user: Omit<{
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                avatarUrl: string | null;
            }, "avatarUrl"> & {
                avatarUrl: string;
            };
            emailMd5: string;
            averageRating: number | null;
        }[];
    }>;
    rawData: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
        input: {
            startDate: string;
            endDate: string;
            teamId?: number | null | undefined;
            userId?: number | null | undefined;
            memberUserId?: number | null | undefined;
            isAll?: boolean | undefined;
            eventTypeId?: number | null | undefined;
        };
        output: {
            data: string;
            filename: string;
        };
    }>;
}>;
//# sourceMappingURL=trpc-router.d.ts.map