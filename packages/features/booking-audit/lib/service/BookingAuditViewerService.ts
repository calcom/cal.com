import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { IAttendeeRepository } from "@calcom/features/bookings/repositories/IAttendeeRepository";
import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { TranslationWithParams } from "../actions/IAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import type { BookingAuditContext } from "../dto/types";
import type { AuditActorType } from "../repository/IAuditActorRepository";
import type {
  BookingAuditAction,
  BookingAuditType,
  BookingAuditWithActor,
  IBookingAuditRepository,
} from "../repository/IBookingAuditRepository";
import type { ActionSource } from "../types/actionSource";
import { enrichActor, getActorDataRequirements } from "./ActorStrategies";
import { BookingAuditAccessService } from "./BookingAuditAccessService";
import { BookingAuditActionServiceRegistry } from "./BookingAuditActionServiceRegistry";
import { type DataRequirements, EnrichmentDataStore } from "./EnrichmentDataStore";

interface BookingAuditViewerServiceDeps {
  bookingAuditRepository: IBookingAuditRepository;
  userRepository: UserRepository;
  bookingRepository: BookingRepository;
  membershipRepository: MembershipRepository;
  attendeeRepository: IAttendeeRepository;
  log: ISimpleLogger;
  credentialRepository: CredentialRepository;
}

type EnrichedAuditLog = {
  id: string;
  bookingUid: string;
  type: BookingAuditType;
  action: BookingAuditAction;
  timestamp: string;
  createdAt: string;
  source: ActionSource;
  operationId: string;
  displayJson?: Record<string, unknown> | null;
  actionDisplayTitle: TranslationWithParams;
  displayFields?: Array<{ labelKey: string; valueKey?: string; value?: string; values?: string[] }> | null;
  actor: {
    id: string;
    type: AuditActorType;
    userUuid: string | null;
    attendeeId: number | null;
    name: string | null;
    createdAt: Date;
    displayName: string;
    displayEmail: string | null;
    displayAvatar: string | null;
  };
  impersonatedBy?: {
    displayName: string;
    displayEmail: string | null;
    displayAvatar: string | null;
  } | null;
  hasError?: boolean;
};

export type DisplayBookingAuditLog = EnrichedAuditLog;

/**
 * BookingAuditViewerService - Service for viewing and formatting booking audit logs
 */
export class BookingAuditViewerService {
  private readonly actionServiceRegistry: BookingAuditActionServiceRegistry;
  private readonly bookingAuditRepository: IBookingAuditRepository;
  private readonly userRepository: UserRepository;
  private readonly bookingRepository: BookingRepository;
  private readonly membershipRepository: MembershipRepository;
  private readonly attendeeRepository: IAttendeeRepository;
  private readonly credentialRepository: CredentialRepository;
  private readonly rescheduledAuditActionService: RescheduledAuditActionService;
  private readonly accessService: BookingAuditAccessService;
  private readonly log: BookingAuditViewerServiceDeps["log"];

  constructor(private readonly deps: BookingAuditViewerServiceDeps) {
    this.bookingAuditRepository = deps.bookingAuditRepository;
    this.userRepository = deps.userRepository;
    this.bookingRepository = deps.bookingRepository;
    this.membershipRepository = deps.membershipRepository;
    this.attendeeRepository = deps.attendeeRepository;
    this.credentialRepository = deps.credentialRepository;
    this.log = deps.log;
    this.rescheduledAuditActionService = new RescheduledAuditActionService();
    this.accessService = new BookingAuditAccessService({
      bookingRepository: this.bookingRepository,
      membershipRepository: this.membershipRepository,
    });
    this.actionServiceRegistry = new BookingAuditActionServiceRegistry();
  }

  /**
   * Get audit logs for a booking with full enrichment and formatting
   * Handles permission checks, fetches logs, enriches actors, and formats display
   *
   * For bookings created from a reschedule (has fromReschedule field), this also
   * fetches the last RESCHEDULED log from the previous booking and includes it
   * as the first log entry with "rescheduled from" context.
   */
  async getAuditLogsForBooking(params: {
    bookingUid: string;
    userId: number;
    userEmail: string;
    userTimeZone: string;
    organizationId: number | null;
  }): Promise<{ bookingUid: string; auditLogs: DisplayBookingAuditLog[] }> {
    const { bookingUid, userId, userTimeZone, organizationId } = params;
    await this.accessService.assertPermissions({
      bookingUid,
      userId,
      organizationId,
    });

    const auditLogs = await this.bookingAuditRepository.findAllForBooking(bookingUid);

    // Check if this booking was created from a reschedule - fetch early for data requirements
    const fromRescheduleUid = await this.bookingRepository.getFromRescheduleUid(bookingUid);
    const rescheduledLogs = fromRescheduleUid
      ? await this.bookingAuditRepository.findRescheduledLogsOfBooking(fromRescheduleUid)
      : [];

    const dataRequirements = this.collectDataRequirements([...auditLogs, ...rescheduledLogs]);
    const dbStore = await this.buildEnrichmentDataStore(dataRequirements);

    const enrichedAuditLogs = await Promise.all(
      auditLogs.map(async (log) => {
        try {
          return await this.enrichAuditLog(log, userTimeZone, dbStore);
        } catch (error) {
          this.log.error(
            `Failed to enrich audit log ${log.id}: ${error instanceof Error ? error.message : String(error)}`
          );
          return this.buildFallbackAuditLog(log);
        }
      })
    );

    // Build rescheduled from log if applicable
    if (fromRescheduleUid && rescheduledLogs.length > 0) {
      const rescheduledFromLog = await this.buildRescheduledFromLog({
        fromRescheduleUid,
        currentBookingUid: bookingUid,
        userTimeZone,
        dbStore,
        rescheduledLogs,
      });
      if (rescheduledFromLog) {
        enrichedAuditLogs.push(rescheduledFromLog);
      }
    }

    return {
      bookingUid: params.bookingUid,
      auditLogs: enrichedAuditLogs,
    };
  }

  /**
   * Enriches a single audit log with actor information and formatted display data
   */
  private async enrichAuditLog(
    log: BookingAuditWithActor,
    userTimeZone: string,
    dbStore: EnrichmentDataStore
  ): Promise<EnrichedAuditLog> {
    const enrichedActor = enrichActor(log.actor, dbStore);

    const actionService = this.actionServiceRegistry.getActionService(log.action);
    const parsedData = actionService.parseStored(log.data);

    const actionDisplayTitle = await actionService.getDisplayTitle({
      storedData: parsedData,
      userTimeZone,
      dbStore,
    });

    const displayJson = actionService.getDisplayJson
      ? actionService.getDisplayJson({ storedData: parsedData, userTimeZone })
      : null;

    const displayFields = actionService.getDisplayFields
      ? await actionService.getDisplayFields({ storedData: parsedData, dbStore })
      : null;

    const impersonatedBy = this.enrichImpersonator({ context: log.context, dbStore });

    return {
      id: log.id,
      bookingUid: log.bookingUid,
      type: log.type,
      action: log.action,
      timestamp: log.timestamp.toISOString(),
      createdAt: log.createdAt.toISOString(),
      source: log.source,
      operationId: log.operationId,
      displayJson,
      actionDisplayTitle,
      displayFields,
      actor: {
        id: log.actor.id,
        type: log.actor.type,
        userUuid: log.actor.userUuid,
        attendeeId: log.actor.attendeeId,
        name: log.actor.name,
        createdAt: log.actor.createdAt,
        displayName: enrichedActor.displayName,
        displayEmail: enrichedActor.displayEmail,
        displayAvatar: enrichedActor.displayAvatar,
      },
      impersonatedBy,
    };
  }

  /**
   * Builds a minimal fallback audit log when enrichment fails.
   * Returns a log entry with hasError: true and basic information from the raw log.
   */
  private buildFallbackAuditLog(log: BookingAuditWithActor): EnrichedAuditLog {
    return {
      id: log.id,
      bookingUid: log.bookingUid,
      type: log.type,
      action: log.action,
      timestamp: log.timestamp.toISOString(),
      createdAt: log.createdAt.toISOString(),
      source: log.source,
      operationId: log.operationId,
      displayJson: null,
      actionDisplayTitle: {
        key: "booking_audit_action.error_processing",
        params: { actionType: log.action },
      },
      displayFields: null,
      actor: {
        id: log.actor.id,
        type: log.actor.type,
        userUuid: log.actor.userUuid,
        attendeeId: log.actor.attendeeId,
        name: log.actor.name,
        createdAt: log.actor.createdAt,
        displayName: log.actor.name || "Unknown",
        displayEmail: null,
        displayAvatar: null,
      },
      impersonatedBy: null,
      hasError: true,
    };
  }

  /**
   * Builds a "rescheduled from" log entry for bookings created from a reschedule.
   * Fetches the RESCHEDULED log from the previous booking and transforms it
   * to show "rescheduled from" context for the current booking.
   */
  private async buildRescheduledFromLog({
    fromRescheduleUid,
    currentBookingUid,
    userTimeZone,
    dbStore,
    rescheduledLogs,
  }: {
    fromRescheduleUid: string;
    currentBookingUid: string;
    userTimeZone: string;
    dbStore: EnrichmentDataStore;
    rescheduledLogs: BookingAuditWithActor[];
  }): Promise<EnrichedAuditLog | null> {
    // Find the specific log that created this booking by matching rescheduledToUid
    const rescheduledLog = this.rescheduledAuditActionService.getMatchingLog({
      rescheduledLogs,
      rescheduledToBookingUid: currentBookingUid,
    });

    if (!rescheduledLog) {
      this.log.error(`No rescheduled log found for booking ${fromRescheduleUid} -> ${currentBookingUid}`);
      // Instead of crashing, we ignore because it is important to be able to access other logs as well.
      return null;
    }

    const enrichedLog = await this.enrichAuditLog(rescheduledLog, userTimeZone, dbStore);
    const parsedData = this.rescheduledAuditActionService.parseStored(rescheduledLog.data);

    // Transform the display JSON to show "rescheduled from" instead of "rescheduled to"
    // by replacing rescheduledToUid with rescheduledFromUid
    const transformedDisplayJson = enrichedLog.displayJson
      ? {
          ...enrichedLog.displayJson,
          rescheduledFromUid: fromRescheduleUid,
        }
      : undefined;

    return {
      ...enrichedLog,
      // Override bookingUid to associate with the current booking being viewed
      bookingUid: currentBookingUid,
      displayJson: transformedDisplayJson,
      // Use a different translation key to show "Rescheduled from" instead of "Rescheduled"
      actionDisplayTitle: this.rescheduledAuditActionService.getDisplayTitleForRescheduledFromLog({
        fromRescheduleUid,
        userTimeZone,
        storedData: parsedData,
      }),
    };
  }

  private enrichImpersonator({
    context,
    dbStore,
  }: {
    context: BookingAuditContext | null;
    dbStore: EnrichmentDataStore;
  }): {
    displayName: string;
    displayEmail: string | null;
    displayAvatar: string | null;
  } | null {
    if (!context?.impersonatedBy) {
      return null;
    }

    const impersonatorUser = dbStore.getUserByUuid(context.impersonatedBy);
    if (!impersonatorUser) {
      return {
        displayName: "Deleted User",
        displayEmail: null,
        displayAvatar: null,
      };
    }

    return {
      displayName: impersonatorUser.name || impersonatorUser.email,
      displayEmail: impersonatorUser.email,
      displayAvatar: impersonatorUser.avatarUrl || null,
    };
  }


  private mergeDataRequirements(...requirements: DataRequirements[]): DataRequirements {
    const userUuids = new Set<string>();
    const attendeeIds = new Set<number>();
    const credentialIds = new Set<number>();
    
    for (const requirement of requirements) {
      for (const uuid of requirement.userUuids || []) userUuids.add(uuid);
      for (const id of requirement.attendeeIds || []) attendeeIds.add(id);
      for (const id of requirement.credentialIds || []) credentialIds.add(id);
    }

    return {
      userUuids: Array.from(userUuids),
      attendeeIds: Array.from(attendeeIds),
      credentialIds: Array.from(credentialIds),
    };
  }

  /**
   * Collect all data requirements from audit logs and action services
   */
  private collectDataRequirements(auditLogs: BookingAuditWithActor[]): DataRequirements {
    let actorRequirements: DataRequirements[] = [];
    let serviceRequirements: DataRequirements[] = [];
    let contextRequirements: DataRequirements[] = [];
    for (const log of auditLogs) {
      actorRequirements.push(getActorDataRequirements(log.actor));

      const context = log.context
      if (context?.impersonatedBy) {
        contextRequirements.push({ userUuids: [context.impersonatedBy] });
      }

      try {
        const actionService = this.actionServiceRegistry.getActionService(log.action);
        const parsedData = actionService.parseStored(log.data);
        serviceRequirements.push(actionService.getDataRequirements(parsedData));
      } catch(error) {
        this.log.error(
          `Failed to get data requirements for action ${log.action}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const allDataRequirements = this.mergeDataRequirements(
      ...actorRequirements,
      ...serviceRequirements,
      ...contextRequirements
    );

    return allDataRequirements;
  }

  /**
   * Build the enrichment data store by bulk-fetching all required data
   */
  private async buildEnrichmentDataStore(requirements: DataRequirements): Promise<EnrichmentDataStore> {
    const dbStore = new EnrichmentDataStore(requirements, {
      userRepository: this.userRepository,
      attendeeRepository: this.attendeeRepository,
      credentialRepository: this.credentialRepository,
    });
    await dbStore.fetch();
    return dbStore;
  }
}
