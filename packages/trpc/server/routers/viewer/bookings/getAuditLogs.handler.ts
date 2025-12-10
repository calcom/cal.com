import type { PrismaClient } from "@calcom/prisma/client";
import { TRPCError } from "@trpc/server";

import { getBookingAuditViewerService } from "@calcom/features/booking-audit/di/BookingAuditViewerService.container";
import { BookingAuditErrorCode, BookingAuditPermissionError } from "@calcom/features/booking-audit/lib/service/BookingAuditAccessService";

import type { TrpcSessionUser } from "../../../types";
import type { TGetAuditLogsInputSchema } from "./getAuditLogs.schema";

type GetAuditLogsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TGetAuditLogsInputSchema;
};

const getErrorMessage = (code: BookingAuditErrorCode): string => {
    switch (code) {
        case BookingAuditErrorCode.ORGANIZATION_ID_REQUIRED:
            return "You must be part of an organization to view audit logs.";
        case BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED:
            return "Booking not found or you do not have permission to view its audit logs.";
        case BookingAuditErrorCode.BOOKING_HAS_NO_OWNER:
            return "Cannot verify permissions: booking has no associated user.";
        case BookingAuditErrorCode.OWNER_NOT_IN_ORGANIZATION:
            return "The booking owner is not a member of your organization.";
        case BookingAuditErrorCode.PERMISSION_DENIED:
            return "You do not have permission to view audit logs for this booking.";
        default:
            return "An error occurred while checking permissions.";
    }
};

export const getAuditLogsHandler = async ({ ctx, input }: GetAuditLogsOptions) => {
    const { user } = ctx;
    const { bookingUid } = input;

    const bookingAuditViewerService = getBookingAuditViewerService();

    try {
        const result = await bookingAuditViewerService.getAuditLogsForBooking({
            bookingUid,
            userId: user.id,
            userEmail: user.email,
            userTimeZone: user.timeZone,
            organizationId: user.organizationId,
        });

        return result;
    } catch (error) {
        if (error instanceof BookingAuditPermissionError) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: getErrorMessage(error.code),
            });
        }
        throw error;
    }
};

