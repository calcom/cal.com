import type { Prisma } from "@prisma/client";

import type { BookingTimeStatusDenormalized } from "@calcom/prisma/client";

export interface FindManyOptions {
  where?: Prisma.BookingTimeStatusDenormalizedWhereInput;
  select?: Prisma.BookingTimeStatusDenormalizedSelect;
  orderBy?:
    | Prisma.BookingTimeStatusDenormalizedOrderByWithRelationInput
    | Prisma.BookingTimeStatusDenormalizedOrderByWithRelationInput[];
  take?: number;
  skip?: number;
}

export interface InsightsFilters {
  teamId?: number | null;
  eventTypeId?: number;
  memberUserId?: number;
  userId?: number;
  isAll?: boolean;
}

export interface IInsightsBookingRepository {
  findMany(options: FindManyOptions): Promise<BookingTimeStatusDenormalized[]>;
  count(options: FindManyOptions): Promise<number>;
}
