import type { Prisma } from "@prisma/client";

import { SelectedCalendarRepository as StaticSelectedCalendarRepository } from "./selectedCalendar";

export interface ISelectedCalendarRepository {
  findFirst(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<{ id: string } | null>;
  findMany(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<Array<{ id: string }>>;
}

export class SelectedCalendarRepository implements ISelectedCalendarRepository {
  async findFirst(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<{ id: string } | null> {
    const result = await StaticSelectedCalendarRepository.findFirst(args);
    return result ? { id: result.id } : null;
  }

  async findMany(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<Array<{ id: string }>> {
    const results = await StaticSelectedCalendarRepository.findMany(args);
    return results.map((r) => ({ id: r.id }));
  }
}
