import type { Prisma } from "@prisma/client";

import { SelectedCalendarRepository as StaticSelectedCalendarRepository } from "./selectedCalendar";

export interface ISelectedCalendarRepository {
  findFirst(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<{ id: string } | null>;
}

export class SelectedCalendarRepository implements ISelectedCalendarRepository {
  async findFirst(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<{ id: string } | null> {
    const result = await StaticSelectedCalendarRepository.findFirst(args);
    return result ? { id: result.id } : null;
  }
}
