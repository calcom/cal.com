import type { CreateBookingInput } from "@calcom/platform-types";
import { Injectable } from "@nestjs/common";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { ErrorsBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/errors.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2026_02_25 } from "@/ee/bookings/2026-02-25/services/output.service";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaOrgMembershipRepository } from "@/lib/repositories/prisma-org-membership.repository";
import { InstantBookingCreateService } from "@/lib/services/instant-booking-create.service";
import { RecurringBookingService } from "@/lib/services/recurring-booking.service";
import { RegularBookingService } from "@/lib/services/regular-booking.service";
import type { AuthOptionalUser } from "@/modules/auth/decorators/get-optional-user/get-optional-user.decorator";
import { BillingService } from "@/modules/billing/services/billing.service";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { EventTypeAccessService } from "@/modules/event-types/services/event-type-access.service";
import { KyselyReadService } from "@/modules/kysely/kysely-read.service";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class BookingsService_2026_02_25 extends BookingsService_2024_08_13 {
  constructor(
    inputService: InputBookingsService_2024_08_13,
    outputService: OutputBookingsService_2026_02_25,
    bookingsRepository: BookingsRepository_2024_08_13,
    bookingSeatRepository: BookingSeatRepository,
    eventTypesRepository: EventTypesRepository_2024_06_14,
    prismaReadService: PrismaReadService,
    kyselyReadService: KyselyReadService,
    billingService: BillingService,
    usersService: UsersService,
    usersRepository: UsersRepository,
    platformBookingsService: PlatformBookingsService,
    oAuthClientRepository: OAuthClientRepository,
    organizationsTeamsRepository: OrganizationsTeamsRepository,
    organizationsRepository: OrganizationsRepository,
    teamsRepository: TeamsRepository,
    teamsEventTypesRepository: TeamsEventTypesRepository,
    errorsBookingsService: ErrorsBookingsService_2024_08_13,
    regularBookingService: RegularBookingService,
    recurringBookingService: RecurringBookingService,
    instantBookingCreateService: InstantBookingCreateService,
    eventTypeAccessService: EventTypeAccessService,
    orgMembershipRepository: PrismaOrgMembershipRepository,
    private readonly prismaEventTypeRepository: PrismaEventTypeRepository
  ) {
    super(
      inputService,
      outputService,
      bookingsRepository,
      bookingSeatRepository,
      eventTypesRepository,
      prismaReadService,
      kyselyReadService,
      billingService,
      usersService,
      usersRepository,
      platformBookingsService,
      oAuthClientRepository,
      organizationsTeamsRepository,
      organizationsRepository,
      teamsRepository,
      teamsEventTypesRepository,
      errorsBookingsService,
      regularBookingService,
      recurringBookingService,
      instantBookingCreateService,
      eventTypeAccessService,
      orgMembershipRepository
    );
  }

  protected override async resolveSkipAvailabilityCheck(
    body: CreateBookingInput,
    eventTypeId: number,
    authUser: AuthOptionalUser
  ): Promise<boolean> {
    if ("allowConflicts" in body && body.allowConflicts && authUser?.id) {
      const accessibleEventType = await this.prismaEventTypeRepository.findByIdWithUserAccess({
        id: eventTypeId,
        userId: authUser.id,
      });
      if (accessibleEventType) {
        return true;
      }
    }
    return false;
  }

  protected override async resolveSkipBookingTimeOutOfBoundsCheck(
    body: CreateBookingInput,
    eventTypeId: number,
    authUser: AuthOptionalUser
  ): Promise<boolean> {
    if ("allowBookingOutOfBounds" in body && body.allowBookingOutOfBounds && authUser?.id) {
      const accessibleEventType = await this.prismaEventTypeRepository.findByIdWithUserAccess({
        id: eventTypeId,
        userId: authUser.id,
      });
      if (accessibleEventType) {
        return true;
      }
    }
    return false;
  }
}
