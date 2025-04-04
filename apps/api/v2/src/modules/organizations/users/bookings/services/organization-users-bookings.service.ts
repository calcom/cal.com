import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { Injectable } from "@nestjs/common";

import { GetBookingsInput_2024_08_13 } from "@calcom/platform-types";
import { User } from "@calcom/prisma/client";

@Injectable()
export class OrganizationUsersBookingsService {
  constructor(private readonly bookingsService: BookingsService_2024_08_13) {}

  async getOrganizationUserBookings(user: User, queryParams: GetBookingsInput_2024_08_13) {
    return await this.bookingsService.getBookings(queryParams, user);
  }
}
