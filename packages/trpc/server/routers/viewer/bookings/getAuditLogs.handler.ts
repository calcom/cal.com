import type { TFunction } from "i18next";

import type { PrismaClient } from "@calcom/prisma/client";
import { TRPCError } from "@trpc/server";

import { getBookingAuditViewerService } from "@calcom/features/booking-audit/di/BookingAuditViewerService.container";
import { BookingAuditErrorCode, BookingAuditPermissionError } from "@calcom/features/booking-audit/lib/service/BookingAuditAccessService";
import { getTranslation } from "@calcom/lib/server/i18n";

import type { TrpcSessionUser } from "../../../types";
import type { TGetAuditLogsInputSchema } from "./getAuditLogs.schema";

type GetAuditLogsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TGetAuditLogsInputSchema;
};

const getErrorMessage = (code: BookingAuditErrorCode, t: TFunction): string => {
    switch (code) {
        case BookingAuditErrorCode.ORGANIZATION_ID_REQUIRED:
            return t("audit_logs_organization_required");
        case BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED:
            return t("audit_logs_booking_not_found_or_permission_denied");
        case BookingAuditErrorCode.BOOKING_HAS_NO_OWNER:
            return t("audit_logs_booking_has_no_owner");
        case BookingAuditErrorCode.OWNER_NOT_IN_ORGANIZATION:
            return t("audit_logs_owner_not_in_organization");
        case BookingAuditErrorCode.PERMISSION_DENIED:
            return t("audit_logs_permission_denied");
        default:
            return t("audit_logs_permission_check_error");
    }
};

export const getAuditLogsHandler = async ({ ctx, input }: GetAuditLogsOptions) => {
    const { user } = ctx;
    const { bookingUid } = input;

    const t = await getTranslation(user.locale ?? "en", "common");
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
                message: getErrorMessage(error.code, t),
            });
        }
        throw error;
    }
};

