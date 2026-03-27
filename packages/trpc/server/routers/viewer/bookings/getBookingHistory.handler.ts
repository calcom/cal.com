import { getBookingHistoryViewerService } from "@calcom/features/booking-audit/di/BookingHistoryViewerService.container";
import { BookingAuditErrorCode } from "@calcom/features/booking-audit/lib/BookingAuditResult";
import type { DisplayBookingAuditLog } from "@calcom/features/booking-audit/lib/service/BookingAuditViewerService";
import type { PrismaClient } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "../../../types";
import type { TGetBookingHistoryInputSchema } from "./getBookingHistory.schema";

type GetBookingHistoryOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetBookingHistoryInputSchema;
};

type BookingHistoryResponse =
  | { status: "success"; data: { bookingUid: string; auditLogs: DisplayBookingAuditLog[] } }
  | { status: "info"; title: string };

const PRESENTATION: Record<BookingAuditErrorCode, string> = {
  [BookingAuditErrorCode.NO_ORGANIZATION_CONTEXT]: "audit_logs_not_available_to_user",
  [BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_NO_ACCESS]: "audit_logs_not_available_to_user",
  [BookingAuditErrorCode.BOOKING_HAS_NO_OWNER]: "audit_logs_not_available_to_user",
  [BookingAuditErrorCode.BOOKING_OWNER_NOT_IN_ORGANIZATION]: "audit_logs_not_available_to_user",
  [BookingAuditErrorCode.TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION]: "audit_logs_not_available_to_user",
  [BookingAuditErrorCode.ORG_MEMBER_PERMISSION_DENIED]: "audit_logs_contact_admin_for_permission",
};

export const getBookingHistoryHandler = async ({
  ctx,
  input,
}: GetBookingHistoryOptions): Promise<BookingHistoryResponse> => {
  const { user } = ctx;
  const { bookingUid } = input;

  const bookingHistoryViewerService = getBookingHistoryViewerService();

  const result = await bookingHistoryViewerService.getHistoryForBooking({
    bookingUid,
    userId: user.id,
    userEmail: user.email,
    userTimeZone: user.timeZone,
    organizationId: user.organizationId,
  });

  if (!result.success) {
    return { status: "info", title: PRESENTATION[result.code] };
  }

  return { status: "success", data: result.data };
};
