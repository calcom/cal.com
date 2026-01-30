import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { IAttendeeRepository } from "@calcom/features/bookings/repositories/IAttendeeRepository";
import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { TranslationWithParams } from "../actions/IAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import type { BookingAuditContext } from "../dto/types";
import { getAppNameFromSlug } from "../getAppNameFromSlug";
import type { AuditActorType } from "../repository/IAuditActorRepository";
import type {
  BookingAuditAction,
  BookingAuditType,
  BookingAuditWithActor,
  IBookingAuditRepository,
} from "../repository/IBookingAuditRepository";
import type { ActionSource } from "../types/actionSource";
import { BookingAuditAccessService } from "./BookingAuditAccessService";
import { BookingAuditActionServiceRegistry } from "./BookingAuditActionServiceRegistry";

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
    this.actionServiceRegistry = new BookingAuditActionServiceRegistry({
      attendeeRepository: this.attendeeRepository,
      userRepository: this.userRepository,
    });
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

    const enrichedAuditLogs = await Promise.all(
      auditLogs.map(async (log) => {
        try {
          return await this.enrichAuditLog(log, userTimeZone);
        } catch (error) {
          this.log.error(
            `Failed to enrich audit log ${log.id}: ${error instanceof Error ? error.message : String(error)}`
          );
          return this.buildFallbackAuditLog(log);
        }
      })
    );

    const fromRescheduleUid = await this.bookingRepository.getFromRescheduleUid(bookingUid);

    // Check if this booking was created from a reschedule
    if (fromRescheduleUid) {
      const rescheduledFromLog = await this.buildRescheduledFromLog({
        fromRescheduleUid,
        currentBookingUid: bookingUid,
        userTimeZone,
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
  private async enrichAuditLog(log: BookingAuditWithActor, userTimeZone: string): Promise<EnrichedAuditLog> {
    const enrichedActor = await this.enrichActorInformation(log.actor);

    const actionService = this.actionServiceRegistry.getActionService(log.action);
    const parsedData = actionService.parseStored(log.data);

    const actionDisplayTitle = await actionService.getDisplayTitle({
      storedData: parsedData,
      userTimeZone,
    });

    const displayJson = actionService.getDisplayJson
      ? actionService.getDisplayJson({ storedData: parsedData, userTimeZone })
      : null;

    const displayFields = actionService.getDisplayFields
      ? await actionService.getDisplayFields({ storedData: parsedData })
      : null;

    const impersonatedBy = await this.enrichImpersonator(log.context);

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
  }: {
    fromRescheduleUid: string;
    currentBookingUid: string;
    userTimeZone: string;
  }): Promise<EnrichedAuditLog | null> {
    const rescheduledLogs = await this.bookingAuditRepository.findRescheduledLogsOfBooking(fromRescheduleUid);

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

    const enrichedLog = await this.enrichAuditLog(rescheduledLog, userTimeZone);
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

  private async enrichImpersonator(context: BookingAuditContext | null): Promise<{
    displayName: string;
    displayEmail: string | null;
    displayAvatar: string | null;
  } | null> {
    if (!context?.impersonatedBy) {
      return null;
    }

    const impersonatorUser = await this.userRepository.findByUuid({ uuid: context.impersonatedBy });
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

  /**
   * Enrich actor information with user details if userUuid exists
   */
  private async enrichActorInformation(actor: BookingAuditWithActor["actor"]): Promise<{
    displayName: string;
    displayEmail: string | null;
    displayAvatar: string | null;
  }> {
    switch (actor.type) {
      case "SYSTEM":
        return {
          displayName: "Cal.com",
          displayEmail: null,
          displayAvatar: null,
        };

      case "GUEST":
        return {
          displayName: actor.name || "Guest",
          displayEmail: null,
          displayAvatar: null,
        };

      case "APP": {
        if (actor.credentialId) {
          const credential = await this.deps.credentialRepository.findByCredentialId(actor.credentialId);
          if (credential) {
            return {
              displayName: getAppNameFromSlug({ appSlug: credential.appId }),
              displayEmail: null,
              displayAvatar: null,
            };
          } else {
            return {
              // Expect that on Credential deletion name would have been set
              displayName: actor.name ?? "Deleted App",
              displayEmail: null,
              displayAvatar: null,
            };
          }
        }
        // We allow creating App actor without credentialId
        return {
          displayName: actor.name ?? "Unknown App",
          // We don't want to show email for App actor as that is an internal email with the purpose of giving uniqueness to each app actor
          displayEmail: null,
          displayAvatar: null,
        };
      }

      case "ATTENDEE": {
        if (!actor.attendeeId) {
          throw new Error("Attendee ID is required for ATTENDEE actor");
        }
        const attendee = await this.attendeeRepository.findById(actor.attendeeId);
        if (attendee) {
          return {
            displayName: attendee.name || attendee.email,
            displayEmail: attendee.email,
            displayAvatar: null,
          };
        }
        return {
          displayName: "Deleted Attendee",
          displayEmail: null,
          displayAvatar: null,
        };
      }

      case "USER": {
        if (!actor.userUuid) {
          throw new Error("User UUID is required for USER actor");
        }
        const actorUser = await this.userRepository.findByUuid({ uuid: actor.userUuid });
        if (actorUser) {
          return {
            displayName: actorUser.name || actorUser.email,
            displayEmail: actorUser.email,
            displayAvatar: actorUser.avatarUrl || null,
          };
        }
        return {
          displayName: "Deleted User",
          displayEmail: null,
          displayAvatar: null,
        };
      }
    }
  }
}
