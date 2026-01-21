import type { LuckyUserService } from "@calcom/features/bookings/lib/getLuckyUser";
import type { getEventTypeResponse } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { Logger } from "tslog";
import type { AvailabilityUsers, IAvailabilityCalculatorDeps } from "./AvailabilityCalculator";
import { AvailabilityCalculator } from "./AvailabilityCalculator";

type EventTypeForAvailability = NonNullable<getEventTypeResponse> & {
  hosts: Array<{
    isFixed: boolean;
    userId: number;
    createdAt?: Date;
    priority?: number | null;
    weight?: number | null;
    groupId?: string | null;
    user: {
      id: number;
      email: string;
      credentials: { id: number; type: string; userId: number | null; teamId: number | null; appId: string | null }[];
      userLevelSelectedCalendars: SelectedCalendar[];
    };
  }>;
  hostGroups?: Array<{ groupId: string; name: string }> | null;
};

export interface IAvailabilityCalculatorFactoryDeps {
  luckyUserService: LuckyUserService;
}

export class AvailabilityCalculatorFactory {
  constructor(private readonly deps: IAvailabilityCalculatorFactoryDeps) {}

  create(
    eventType: EventTypeForAvailability,
    users: AvailabilityUsers,
    logger: Logger<unknown>
  ): AvailabilityCalculator {
    const calculatorDeps: IAvailabilityCalculatorDeps = {
      luckyUserService: this.deps.luckyUserService,
      logger,
    };

    return new AvailabilityCalculator(eventType, users, calculatorDeps);
  }
}
