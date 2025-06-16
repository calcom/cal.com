import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

import { GetBookingsInput_2024_08_13 } from "@calcom/platform-types";

@Injectable()
export class OrganizationUsersBookingsService {
  constructor(
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly usersRepository: UsersRepository
  ) {}

  async getOrganizationUserBookings(orgId: number, userId: number, queryParams: GetBookingsInput_2024_08_13) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`getOrganizationUserBookings - User ${userId} not found`);
    }
    return await this.bookingsService.getBookings(queryParams, { orgId, id: user.id, email: user.email });
  }
}
