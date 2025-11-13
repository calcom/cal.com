import type { JsonValue } from "@calcom/types/Json";
import logger from "@calcom/lib/logger";
import type { IBookingAuditRepository, BookingAuditType, BookingAuditAction } from "../repository/IBookingAuditRepository";

interface BookingAuditServiceDeps {
    bookingAuditRepository: IBookingAuditRepository;
}

type CreateBookingAuditInput = {
    bookingUid: string;
    actorId: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    data: JsonValue;
    timestamp: Date; // Required: actual time of the booking change (business event)
};

type BookingAudit = {
    id: string;
    bookingUid: string;
    actorId: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
    data: JsonValue;
};

/**
 * BookingAuditService - Central service for all booking audit operations
 * Handles both write (audit creation) and read (display) operations
 * Each action service manages its own schema versioning
 */
export class BookingAuditService {
    private readonly bookingAuditRepository: IBookingAuditRepository;

    constructor(private readonly deps: BookingAuditServiceDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
    }

    /**
     * TODO: TO be integrated with public methods in followup PR
     */
    async createAuditRecord(input: CreateBookingAuditInput): Promise<BookingAudit> {
        logger.info("Creating audit record", { input });

        return this.bookingAuditRepository.create({
            bookingUid: input.bookingUid,
            actorId: input.actorId,
            type: input.type,
            action: input.action,
            timestamp: input.timestamp,
            data: input.data,
        });
    }
}