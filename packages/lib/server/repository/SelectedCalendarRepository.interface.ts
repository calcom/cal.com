import type { Prisma, SelectedCalendar } from "@calcom/prisma/client";

export interface ISelectedCalendarRepository {
  findById(
    id: string
  ): Promise<(SelectedCalendar & { credential: { delegationCredential: unknown } | null }) | null>;
  findNotSubscribed({ take }: { take: number }): Promise<SelectedCalendar[]>;
  findMany(args: {
    where: Prisma.SelectedCalendarWhereInput;
  }): Promise<{ id: string; externalId: string; credentialId: number | null; syncedAt: Date | null }[]>;
  findByChannelId(channelId: string): Promise<SelectedCalendar | null>;
  updateById(id: string, data: Prisma.SelectedCalendarUpdateInput): Promise<SelectedCalendar>;
}
