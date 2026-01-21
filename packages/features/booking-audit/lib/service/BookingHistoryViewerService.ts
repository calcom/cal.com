import type { RoutingFormResponseRepositoryInterface } from "@calcom/lib/server/repository/RoutingFormResponseRepository.interface";

import type { BookingAuditViewerService, DisplayBookingAuditLog } from "./BookingAuditViewerService";
import { getFieldResponseByIdentifier } from "@calcom/features/routing-forms/lib/getFieldResponseByIdentifier";

type GetHistoryForBookingParams = {
    bookingUid: string;
    userId: number;
    userEmail: string;
    userTimeZone: string;
    organizationId: number | null;
};

type BookingHistoryLog = DisplayBookingAuditLog;

interface BookingHistoryViewerServiceDeps {
    bookingAuditViewerService: BookingAuditViewerService;
    routingFormResponseRepository: RoutingFormResponseRepositoryInterface;
}

export class BookingHistoryViewerService {
    private readonly bookingAuditViewerService: BookingAuditViewerService;
    private readonly routingFormResponseRepository: RoutingFormResponseRepositoryInterface;

    constructor(private readonly deps: BookingHistoryViewerServiceDeps) {
        this.bookingAuditViewerService = deps.bookingAuditViewerService;
        this.routingFormResponseRepository = deps.routingFormResponseRepository;
    }

    private sortLogsReverseChronologically(historyLogs: BookingHistoryLog[]): BookingHistoryLog[] {
        return historyLogs.sort((a, b) => {
            const timestampA = new Date(a.timestamp).getTime();
            const timestampB = new Date(b.timestamp).getTime();
            return timestampB - timestampA;
        });
    }

    private async getFormAuditLogsForBooking(bookingUid: string): Promise<BookingHistoryLog[]> {
        // TODO: Form doesn't have its Audit Logs yet, so we replicate them using the Form Response directly for now.
        const formResponse = await this.routingFormResponseRepository.findByBookingUidIncludeForm(bookingUid);
        if (!formResponse) {
            return [];
        }
        return [this.createFormSubmissionEntry({ formResponse, bookingUid })];
    }

    async getHistoryForBooking(
        params: GetHistoryForBookingParams
    ): Promise<{ bookingUid: string; auditLogs: BookingHistoryLog[] }> {
        const { bookingUid } = params;

        const { auditLogs: bookingAuditLogs } = await this.bookingAuditViewerService.getAuditLogsForBooking(params);

        const historyEntries: BookingHistoryLog[] = [...bookingAuditLogs, ...await this.getFormAuditLogsForBooking(bookingUid)];

        const sortedLogs = this.sortLogsReverseChronologically(historyEntries);

        return {
            bookingUid,
            auditLogs: sortedLogs,
        };
    }

    private createFormSubmissionEntry({
        formResponse,
        bookingUid,
    }: {
        formResponse: NonNullable<
            Awaited<ReturnType<RoutingFormResponseRepositoryInterface["findByBookingUidIncludeForm"]>>
        >;
        bookingUid: string;
    }): BookingHistoryLog {
        const timestamp = formResponse.createdAt.toISOString();

        const emailFieldResult = getFieldResponseByIdentifier({ responsePayload: formResponse.response, formFields: formResponse.form.fields, identifier: "email" });
        const emailFieldValueFromResponse = emailFieldResult.success ? emailFieldResult.data : null;
        // A valid string can be the email otherwise we assume it is not an email
        const submitterEmail = typeof emailFieldValueFromResponse === "string" ? emailFieldValueFromResponse : null;
        const uniqueId = `form-submission-${formResponse.id}`;
        return {
            id: uniqueId,
            bookingUid,
            type: "RECORD_CREATED",
            action: "CREATED",
            timestamp,
            createdAt: timestamp,
            source: "WEBAPP",
            operationId: uniqueId,
            displayJson: null,
            actionDisplayTitle: { key: "form_submitted" },
            displayFields: null,
            actor: {
                id: `form-submission-actor-${formResponse.id}`,
                type: "GUEST",
                userUuid: null,
                attendeeId: null,
                name: null,
                createdAt: formResponse.createdAt,
                displayName: submitterEmail ? `${submitterEmail}` : "Guest",
                displayEmail: submitterEmail || null,
                displayAvatar: null,
            },
        };
    }
}
