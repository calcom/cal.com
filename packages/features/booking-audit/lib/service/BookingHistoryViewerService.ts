import type { RoutingFormResponseRepositoryInterface } from "@calcom/lib/server/repository/RoutingFormResponseRepository.interface";
import type { BookingAuditViewerService } from "./BookingAuditViewerService";

type GetHistoryForBookingParams = {
    bookingUid: string;
    userId: number;
    userEmail: string;
    userTimeZone: string;
    organizationId: number | null;
};

type HistoryEntry = Awaited<
    ReturnType<BookingAuditViewerService["getAuditLogsForBooking"]>
>["auditLogs"][number];

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

    async getHistoryForBooking(
        params: GetHistoryForBookingParams
    ): Promise<{ bookingUid: string; auditLogs: HistoryEntry[] }> {
        const { bookingUid } = params;

        const auditLogsResult = await this.bookingAuditViewerService.getAuditLogsForBooking(params);

        const formResponse = await this.routingFormResponseRepository.findByBookingUidIncludeForm(bookingUid);

        const historyEntries: HistoryEntry[] = [...auditLogsResult.auditLogs];

        if (formResponse) {
            const formSubmissionEntry = this.createFormSubmissionEntry({
                formResponse,
                bookingUid,
            });
            historyEntries.push(formSubmissionEntry);
        }

        historyEntries.sort((a, b) => {
            const timestampA = new Date(a.timestamp).getTime();
            const timestampB = new Date(b.timestamp).getTime();
            return timestampA - timestampB;
        });

        return {
            bookingUid,
            auditLogs: historyEntries,
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
    }): HistoryEntry {
        const timestamp = formResponse.createdAt.toISOString();

        return {
            id: `form-submission-${formResponse.id}`,
            bookingUid,
            type: "RECORD_CREATED",
            action: "CREATED",
            timestamp,
            createdAt: timestamp,
            source: "WEBAPP",
            operationId: `form-submission-${formResponse.id}`,
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
                displayName: "Guest",
                displayEmail: null,
                displayAvatar: null,
            },
        };
    }
}
