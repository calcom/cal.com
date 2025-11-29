import type { JsonValue } from "@calcom/types/Json";
import logger from "@calcom/lib/logger";
import type { IBookingAuditRepository, BookingAuditType, BookingAuditAction } from "../repository/IBookingAuditRepository";
import type { IAuditActorRepository } from "../repository/IAuditActorRepository";
import { safeStringify } from "@calcom/lib/safeStringify";

interface BookingAuditServiceDeps {
    bookingAuditRepository: IBookingAuditRepository;
    actorRepository: IAuditActorRepository;
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
 * 
 */
export class BookingAuditService {
    private readonly bookingAuditRepository: IBookingAuditRepository;

    constructor(private readonly deps: BookingAuditServiceDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
    }

    /**
     * Creates a new audit record for a booking action
     * 
     * @param input - The audit record data including bookingUid, actorId, type, action, data, and timestamp
     * @returns The created audit record
     */
    async createAuditRecord(input: CreateBookingAuditInput): Promise<BookingAudit> {
        // Log only non-sensitive metadata, excluding the data field which may contain PII
        logger.info("Creating audit record", safeStringify({
            bookingUid: input.bookingUid,
            actorId: input.actorId,
            type: input.type,
            action: input.action,
            timestamp: input.timestamp,
        }));

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

