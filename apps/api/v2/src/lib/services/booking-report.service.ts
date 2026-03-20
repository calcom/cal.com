import { BookingReportService as BaseBookingReportService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaBookingReportRepository } from "@/lib/repositories/prisma-booking-report.repository";
import { PrismaOrganizationSettingsRepository } from "@/lib/repositories/prisma-organization-settings.repository";
import { BookingAccessService } from "@/lib/services/booking-access.service";

@Injectable()
export class BookingReportService extends BaseBookingReportService {
  constructor(
    bookingRepo: PrismaBookingRepository,
    bookingReportRepo: PrismaBookingReportRepository,
    bookingAccessService: BookingAccessService,
    organizationSettingsRepo: PrismaOrganizationSettingsRepository
  ) {
    super({ bookingRepo, bookingReportRepo, bookingAccessService, organizationSettingsRepo });
  }
}
