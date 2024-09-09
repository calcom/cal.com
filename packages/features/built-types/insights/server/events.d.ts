import type { AcceleratePromise } from "@prisma/extension-accelerate";
import type { Dayjs } from "@calcom/dayjs";
import type { Prisma } from "@calcom/prisma/client";
import type { RawDataInput } from "./raw-data.schema";
type TimeViewType = "week" | "month" | "year" | "day";
declare class EventsInsights {
    static runSeparateQueriesForOrStatements: <T, R>(where: Prisma.BookingTimeStatusWhereInput, queryReference: (args: T) => AcceleratePromise<R>, originalArgs: T) => Promise<R | (Awaited<R> extends infer T_1 ? T_1 extends Awaited<R> ? T_1 extends readonly (infer InnerArr)[] ? InnerArr : T_1 : never : never)[]>;
    static countGroupedByStatus: (where: Prisma.BookingTimeStatusWhereInput) => Promise<{
        [x: string]: number;
    }>;
    static getAverageRating: (whereConditional: Prisma.BookingTimeStatusWhereInput) => Promise<import("@prisma/client/runtime/library").GetAggregateResult<Prisma.$BookingTimeStatusPayload<import("@prisma/client/runtime/library").InternalArgs<{
        [x: string]: {
            [x: string]: unknown;
        };
    }, {
        [x: string]: {
            [x: string]: unknown;
        };
    }, {
        [x: string]: {
            [x: string]: unknown;
        };
    }, {
        [x: string]: unknown;
    }> & {
        result: {};
        model: {
            $allModels: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            host: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            eventType: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            user: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            accessToken: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            refreshToken: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            attendee: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            profile: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            team: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            hashedLink: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            availability: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            destinationCalendar: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            schedule: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            secondaryEmail: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            credential: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            userPassword: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            travelSchedule: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            notificationsSubscriptions: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            organizationSettings: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            membership: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            verificationToken: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            instantMeetingToken: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            bookingReference: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            booking: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            selectedCalendar: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            eventTypeCustomInput: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            resetPasswordRequest: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            reminderMail: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            payment: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            webhook: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            impersonations: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            apiKey: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            account: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            session: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            app: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            app_RoutingForms_Form: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            app_RoutingForms_FormResponse: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            feedback: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            workflowStep: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            workflow: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            aIPhoneCallConfiguration: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            workflowsOnEventTypes: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            workflowsOnTeams: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            deployment: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            workflowReminder: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            webhookScheduledTriggers: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            bookingSeat: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            verifiedNumber: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            verifiedEmail: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            feature: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            selectedSlots: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            oAuthClient: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            accessCode: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            calendarCache: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            tempOrgRedirect: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            avatar: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            outOfOfficeEntry: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            outOfOfficeReason: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            platformOAuthClient: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            platformAuthorizationToken: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            dSyncData: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            dSyncTeamGroupMapping: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            task: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            platformBilling: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            attributeOption: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            attribute: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            attributeToUser: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
            bookingTimeStatus: {
                aggregate: () => <T, A>(this: T, args: Prisma.Exact<A, Prisma.Args<T, "aggregate"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T, A, "aggregate">>;
                count: () => <T_1, A_1>(this: T_1, args?: Prisma.Exact<A_1, Prisma.Args<T_1, "count"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_1, A_1, "count">>;
                findFirst: () => <T_2, A_2>(this: T_2, args?: Prisma.Exact<A_2, Prisma.Args<T_2, "findFirst"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_2, A_2, "findFirst"> | null>;
                findFirstOrThrow: () => <T_3, A_3>(this: T_3, args?: Prisma.Exact<A_3, Prisma.Args<T_3, "findFirstOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_3, A_3, "findFirstOrThrow">>;
                findMany: () => <T_4, A_4>(this: T_4, args?: Prisma.Exact<A_4, Prisma.Args<T_4, "findMany"> & import("@prisma/extension-accelerate").PrismaCacheStrategy> | undefined) => AcceleratePromise<Prisma.Result<T_4, A_4, "findMany">>;
                findUnique: () => <T_5, A_5>(this: T_5, args: Prisma.Exact<A_5, Prisma.Args<T_5, "findUnique"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_5, A_5, "findUnique"> | null>;
                findUniqueOrThrow: () => <T_6, A_6>(this: T_6, args: Prisma.Exact<A_6, Prisma.Args<T_6, "findUniqueOrThrow"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_6, A_6, "findUniqueOrThrow">>;
                groupBy: () => <T_7, A_7>(this: T_7, args: Prisma.Exact<A_7, Prisma.Args<T_7, "groupBy"> & import("@prisma/extension-accelerate").PrismaCacheStrategy>) => AcceleratePromise<Prisma.Result<T_7, A_7, "groupBy">>;
            };
        };
        query: {};
        client: {};
    }>, {
        _avg: {
            rating: true;
        };
        where: {
            rating: {
                not: null;
            };
            AND?: Prisma.BookingTimeStatusWhereInput | Prisma.BookingTimeStatusWhereInput[] | undefined;
            OR?: Prisma.BookingTimeStatusWhereInput[] | undefined;
            NOT?: Prisma.BookingTimeStatusWhereInput | Prisma.BookingTimeStatusWhereInput[] | undefined;
            id?: number | Prisma.IntFilter<"BookingTimeStatus"> | undefined;
            uid?: string | Prisma.StringNullableFilter<"BookingTimeStatus"> | null | undefined;
            eventTypeId?: number | Prisma.IntNullableFilter<"BookingTimeStatus"> | null | undefined;
            title?: string | Prisma.StringNullableFilter<"BookingTimeStatus"> | null | undefined;
            description?: string | Prisma.StringNullableFilter<"BookingTimeStatus"> | null | undefined;
            startTime?: string | Date | Prisma.DateTimeNullableFilter<"BookingTimeStatus"> | null | undefined;
            endTime?: string | Date | Prisma.DateTimeNullableFilter<"BookingTimeStatus"> | null | undefined;
            createdAt?: string | Date | Prisma.DateTimeNullableFilter<"BookingTimeStatus"> | null | undefined;
            location?: string | Prisma.StringNullableFilter<"BookingTimeStatus"> | null | undefined;
            paid?: boolean | Prisma.BoolNullableFilter<"BookingTimeStatus"> | null | undefined;
            status?: import(".prisma/client").$Enums.BookingStatus | Prisma.EnumBookingStatusNullableFilter<"BookingTimeStatus"> | null | undefined;
            rescheduled?: boolean | Prisma.BoolNullableFilter<"BookingTimeStatus"> | null | undefined;
            userId?: number | Prisma.IntNullableFilter<"BookingTimeStatus"> | null | undefined;
            teamId?: number | Prisma.IntNullableFilter<"BookingTimeStatus"> | null | undefined;
            eventLength?: number | Prisma.IntNullableFilter<"BookingTimeStatus"> | null | undefined;
            timeStatus?: string | Prisma.StringNullableFilter<"BookingTimeStatus"> | null | undefined;
            eventParentId?: number | Prisma.IntNullableFilter<"BookingTimeStatus"> | null | undefined;
            userEmail?: string | Prisma.StringNullableFilter<"BookingTimeStatus"> | null | undefined;
            username?: string | Prisma.StringNullableFilter<"BookingTimeStatus"> | null | undefined;
            ratingFeedback?: string | Prisma.StringNullableFilter<"BookingTimeStatus"> | null | undefined;
            noShowHost?: boolean | Prisma.BoolNullableFilter<"BookingTimeStatus"> | null | undefined;
        };
    }>>;
    static getTotalNoShows: (whereConditional: Prisma.BookingTimeStatusWhereInput) => Promise<number>;
    static getTotalCSAT: (whereConditional: Prisma.BookingTimeStatusWhereInput) => Promise<number>;
    static getTimeLine: (timeView: TimeViewType, startDate: Dayjs, endDate: Dayjs) => Promise<string[]>;
    static getTimeView: (timeView: TimeViewType, startDate: Dayjs, endDate: Dayjs) => TimeViewType;
    static getDailyTimeline(startDate: Dayjs, endDate: Dayjs): string[];
    static getWeekTimeline(startDate: Dayjs, endDate: Dayjs): string[];
    static getMonthTimeline(startDate: Dayjs, endDate: Dayjs): string[];
    static getYearTimeline(startDate: Dayjs, endDate: Dayjs): string[];
    static getPercentage: (actualMetric: number, previousMetric: number) => number;
    static getCsvData: (props: RawDataInput & {
        organizationId: number | null;
        isOrgAdminOrOwner: boolean | null;
    }) => Promise<{
        title: string | null;
        id: number;
        eventTypeId: number | null;
        uid: string | null;
        username: string | null;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date | null;
        paid: boolean | null;
        rating: number | null;
        ratingFeedback: string | null;
        noShowHost: boolean | null;
        eventLength: number | null;
        timeStatus: string | null;
        userEmail: string | null;
    }[]>;
    static obtainWhereConditional: (props: {
        startDate: string;
        endDate: string;
        teamId?: number | null | undefined;
        userId?: number | null | undefined;
        memberUserId?: number | null | undefined;
        isAll?: boolean | undefined;
        eventTypeId?: number | null | undefined;
    } & {
        organizationId: number | null;
        isOrgAdminOrOwner: boolean | null;
    }) => Promise<Prisma.BookingTimeStatusWhereInput>;
    static userIsOwnerAdminOfTeam: ({ sessionUserId, teamId, }: {
        sessionUserId: number;
        teamId: number;
    }) => Promise<boolean>;
    static userIsOwnerAdminOfParentTeam: ({ sessionUserId, teamId, }: {
        sessionUserId: number;
        teamId: number;
    }) => Promise<boolean>;
    static objectToCsv(data: Record<string, unknown>[]): string;
}
export { EventsInsights };
//# sourceMappingURL=events.d.ts.map