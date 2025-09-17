import type { Prisma } from "@calcom/prisma/client";

export class ISelectedCalendarRepository {
  findById(id: string): Promise<Prisma.SelectedCalendar | null>;
  findNotSubscribed({ take }: { take: number }): Promise<Prisma.SelectedCalendar[]>;
  findMany(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<Prisma.SelectedCalendar[]>;
  findByChannelId(channelId: string): Promise<Prisma.SelectedCalendar | null>;
  updateById(id: string, data: Prisma.SelectedCalendarUpdateInput): Promise<Prisma.SelectedCalendar>;
}
