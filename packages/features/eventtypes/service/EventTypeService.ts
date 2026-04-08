import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { DailyLocationType } from "@calcom/app-store/constants";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import type { DestinationCalendarService } from "@calcom/features/calendars/services/DestinationCalendarService";
import { CalVideoSettingsRepository } from "@calcom/features/calVideoSettings/repositories/CalVideoSettingsRepository";
import updateChildrenEventTypes from "@calcom/features/ee/managed-event-types/lib/handleChildrenEventTypes";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { isUrlScanningEnabled } from "@calcom/features/ee/workflows/lib/urlScanner";
import { checkSuccessRedirectUrlAllowed } from "@calcom/features/eventtypes/lib/successRedirectUrlAllowed";
import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import type { PrismaMembershipRepository as MembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { shouldHideBrandingForEventUsingProfile } from "@calcom/features/profile/lib/hideBranding";
import type { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import tasker from "@calcom/features/tasker";
import { submitUrlForUrlScanning } from "@calcom/features/tasker/tasks/scanWorkflowUrls";
import { getTranslation } from "@calcom/i18n/server";
import { ErrorWithCode } from "@calcom/lib/errors";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";
import logger from "@calcom/lib/logger";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import {
  EventTypeAutoTranslatedField,
  RRTimestampBasis,
  SchedulingType,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { eventTypeLocations } from "@calcom/prisma/zod-utils";
import {
  ensureEmailOrPhoneNumberIsPresent,
  ensureUniqueBookingFields,
  handleCustomInputs,
  handlePeriodType,
} from "../lib/eventTypeUpdateUtils";
import type { EventTypeUpdateInput, PendingHostChangesInput } from "../lib/types";
import type { EventTypeRepository } from "../repositories/eventTypeRepository";

export interface IEventTypeServiceDeps {
  eventTypeRepository: EventTypeRepository;
  prisma: PrismaClient;
  membershipRepository: MembershipRepository;
  scheduleRepository: ScheduleRepository;
  hashedLinkService: HashedLinkService;
  destinationCalendarService: DestinationCalendarService;
}

/**
 * Shape of pre-fetched branding data that callers can pass to avoid a DB query.
 * Matches the raw DB shape returned by EventTypeRepository.findByIdIncludeBrandingInfo.
 */
export type EventTypeBrandingData = {
  team: {
    hideBranding: boolean | null;
    parent: { hideBranding: boolean | null } | null;
  } | null;
  owner: {
    id: number;
    hideBranding: boolean | null;
    profiles: Array<{ organization: { hideBranding: boolean | null } | null }>;
  } | null;
};

interface UpdateEventTypeUser {
  id: number;
  username: string | null;
  profile: { id: number | null };
  userLevelSelectedCalendars: { externalId: string }[];
  organizationId: number | null;
  email: string;
  locale: string;
}

interface UpdateEventTypeOptions {
  user: UpdateEventTypeUser;
  input: EventTypeUpdateInput;
  res?: { revalidate?: (path: string) => Promise<void> };
}

export class EventTypeService {
  constructor(private readonly deps: IEventTypeServiceDeps) {}

  async shouldHideBrandingForEventType(
    eventTypeId: number,
    prefetchedData?: EventTypeBrandingData
  ): Promise<boolean> {
    const data =
      prefetchedData ??
      (await this.deps.eventTypeRepository.findByIdIncludeBrandingInfo({ id: eventTypeId }));

    if (!data) return false;

    return shouldHideBrandingForEventUsingProfile({
      eventTypeId,
      team: data.team
        ? {
            hideBranding: data.team.hideBranding,
            parent: data.team.parent,
          }
        : null,
      owner: data.owner
        ? {
            id: data.owner.id,
            hideBranding: data.owner.hideBranding,
            profile: data.owner.profiles?.[0] ? { organization: data.owner.profiles[0].organization } : null,
          }
        : null,
    });
  }

  async update({ user, input, res }: UpdateEventTypeOptions) {
    const {
      schedule,
      instantMeetingSchedule,
      periodType,
      locations,
      bookingLimits,
      durationLimits,
      maxActiveBookingsPerBooker,
      destinationCalendar,
      customInputs,
      recurringEvent,
      eventTypeColor,
      users,
      children,
      assignAllTeamMembers,
      hosts,
      pendingHostChanges,
      pendingFixedHostChanges,
      id,
      multiplePrivateLinks,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId,
      bookingFields,
      offsetStart,
      secondaryEmailId,
      aiPhoneCallConfig,
      isRRWeightsEnabled,
      autoTranslateDescriptionEnabled,
      autoTranslateInstantMeetingTitleEnabled,
      description: newDescription,
      title: newTitle,
      seatsPerTimeSlot,
      restrictionScheduleId,
      calVideoSettings,
      hostGroups,
      enablePerHostLocations,
      shouldMergePhoneSystemFields,
      ...rest
    } = input;

    const eventType = await this.deps.eventTypeRepository.findByIdWithFullDetail({ id });

    if (input.teamId && eventType.team?.id && input.teamId !== eventType.team.id) {
      throw ErrorWithCode.Factory.Forbidden("Unauthorized team access");
    }

    if (rest.successRedirectUrl) {
      const redirectUrlCheck = await checkSuccessRedirectUrlAllowed({
        userId: user.id,
        eventTypeId: id,
      });
      if (!redirectUrlCheck.allowed) {
        throw ErrorWithCode.Factory.Forbidden(redirectUrlCheck.reason);
      }
    }

    const finalSeatsPerTimeSlot =
      seatsPerTimeSlot === undefined ? eventType.seatsPerTimeSlot : seatsPerTimeSlot;
    const finalRecurringEvent = recurringEvent === undefined ? eventType.recurringEvent : recurringEvent;

    if (finalSeatsPerTimeSlot && finalRecurringEvent) {
      throw ErrorWithCode.Factory.BadRequest(
        "Recurring Events and Offer Seats cannot be active at the same time."
      );
    }

    const teamId = input.teamId || eventType.team?.id;
    const guestsField = bookingFields?.find((field) => field.name === "guests");

    ensureUniqueBookingFields(bookingFields);
    ensureEmailOrPhoneNumberIsPresent(bookingFields);

    if (autoTranslateDescriptionEnabled && !user.organizationId) {
      logger.error(
        "Auto-translating description requires an organization. This should not happen - UI controls should prevent this state."
      );
    }

    const isLoadBalancingDisabled = !!(
      (eventType.team?.rrTimestampBasis &&
        eventType.team?.rrTimestampBasis !== RRTimestampBasis.CREATED_AT) ||
      (hostGroups && hostGroups.length > 1) ||
      (!hostGroups && eventType.hostGroups && eventType.hostGroups.length > 1)
    );

    const data: Prisma.EventTypeUpdateInput = {
      ...rest,
      ...(autoTranslateInstantMeetingTitleEnabled !== undefined && {
        autoTranslateInstantMeetingTitleEnabled,
      }),
      ...(autoTranslateDescriptionEnabled !== undefined && {
        autoTranslateDescriptionEnabled: Boolean(user.organizationId && autoTranslateDescriptionEnabled),
      }),
      description: newDescription,
      title: newTitle,
      bookingFields:
        bookingFields === null ? Prisma.DbNull : (bookingFields as Prisma.InputJsonValue | undefined),
      maxActiveBookingsPerBooker,
      isRRWeightsEnabled,
      rrSegmentQueryValue:
        rest.rrSegmentQueryValue === null
          ? Prisma.DbNull
          : (rest.rrSegmentQueryValue as Prisma.InputJsonValue),
      metadata: rest.metadata === null ? Prisma.DbNull : (rest.metadata as Prisma.InputJsonObject),
      eventTypeColor: eventTypeColor === null ? Prisma.DbNull : (eventTypeColor as Prisma.InputJsonObject),
      ...(bookingFields !== undefined && {
        disableGuests: guestsField?.hidden ?? false,
      }),
      seatsPerTimeSlot,
      maxLeadThreshold: isLoadBalancingDisabled ? null : rest.maxLeadThreshold,
      ...(enablePerHostLocations !== undefined && { enablePerHostLocations }),
      ...(shouldMergePhoneSystemFields !== undefined && { shouldMergePhoneSystemFields }),
    };
    if (rest.successRedirectUrl && rest.successRedirectUrl !== eventType.successRedirectUrl) {
      data.successRedirectUrlUpdatedAt = new Date();
    }

    data.locations = locations ?? undefined;

    if (periodType) {
      data.periodType = handlePeriodType(periodType);
    }

    if (recurringEvent) {
      data.recurringEvent = {
        dstart: recurringEvent.dtstart as unknown as Prisma.InputJsonObject,
        interval: recurringEvent.interval,
        count: recurringEvent.count,
        freq: recurringEvent.freq,
        until: recurringEvent.until as unknown as Prisma.InputJsonObject,
        tzid: recurringEvent.tzid,
      };
    } else if (recurringEvent === null) {
      data.recurringEvent = Prisma.DbNull;
    }

    if (destinationCalendar) {
      await this.deps.destinationCalendarService.setDestinationCalendar({
        userId: user.id,
        userEmail: user.email,
        userLevelSelectedCalendars: user.userLevelSelectedCalendars,
        ...destinationCalendar,
        eventTypeId: id,
      });
    }

    if (customInputs) {
      data.customInputs = handleCustomInputs(customInputs, id);
    }

    if (bookingLimits) {
      const isValid = validateIntervalLimitOrder(bookingLimits);
      if (!isValid) throw ErrorWithCode.Factory.BadRequest("Booking limits must be in ascending order.");
      data.bookingLimits = bookingLimits;
    }

    if (maxActiveBookingsPerBooker) {
      if (maxActiveBookingsPerBooker < 1) {
        throw ErrorWithCode.Factory.BadRequest("Booker booking limit must be greater than 0.");
      }

      if (maxActiveBookingsPerBooker && (recurringEvent || eventType.recurringEvent)) {
        throw ErrorWithCode.Factory.BadRequest(
          "Recurring Events and booker active bookings limit cannot be active at the same time."
        );
      }

      if (eventType.maxActiveBookingsPerBooker && recurringEvent) {
        throw ErrorWithCode.Factory.BadRequest(
          "Recurring Events and booker active bookings limit cannot be active at the same time."
        );
      }

      data.maxActiveBookingsPerBooker = maxActiveBookingsPerBooker;
    }

    if (durationLimits) {
      const isValid = validateIntervalLimitOrder(durationLimits);
      if (!isValid) throw ErrorWithCode.Factory.BadRequest("Duration limits must be in ascending order.");
      data.durationLimits = durationLimits;
    }

    if (offsetStart !== undefined) {
      if (offsetStart < 0) {
        throw ErrorWithCode.Factory.BadRequest("Offset start time must be zero or greater.");
      }
      data.offsetStart = offsetStart;
    }

    const bookerLayoutsError = validateBookerLayouts(input.metadata?.bookerLayouts || null);
    if (bookerLayoutsError) {
      const t = await getTranslation("en", "common");
      throw ErrorWithCode.Factory.BadRequest(t(bookerLayoutsError));
    }

    if (schedule) {
      const userScheduleQuery = await this.deps.scheduleRepository.findByUserIdAndScheduleId({
        userId: user.id,
        scheduleId: schedule,
      });
      if (userScheduleQuery) {
        data.schedule = { connect: { id: schedule } };
      }
    } else if (null === schedule || schedule === 0) {
      data.schedule = { disconnect: true };
    }

    if (instantMeetingSchedule) {
      data.instantMeetingSchedule = { connect: { id: instantMeetingSchedule } };
    } else if (instantMeetingSchedule === null || schedule === null) {
      data.instantMeetingSchedule = { disconnect: true };
    }

    if (restrictionScheduleId) {
      const restrictionSchedule = await this.deps.scheduleRepository.findScheduleByIdForOwnershipCheck({
        scheduleId: restrictionScheduleId,
      });
      if (restrictionSchedule?.userId !== user.id) {
        if (!teamId || !restrictionSchedule) {
          throw ErrorWithCode.Factory.Forbidden("The restriction schedule is not owned by you or your team");
        }
        const hasMembership = await this.deps.membershipRepository.hasMembership({
          teamId,
          userId: restrictionSchedule.userId,
        });
        if (!hasMembership) {
          throw ErrorWithCode.Factory.Forbidden("The restriction schedule is not owned by you or your team");
        }
      }

      data.restrictionSchedule = { connect: { id: restrictionScheduleId } };
    } else if (restrictionScheduleId === null || restrictionScheduleId === 0) {
      data.restrictionSchedule = { disconnect: true };
    }

    if (users?.length) {
      data.users = {
        set: [],
        connect: users.map((userId: number) => ({ id: userId })),
      };
    }

    if (hostGroups !== undefined) {
      await this.deps.eventTypeRepository.syncHostGroups({ eventTypeId: id, hostGroups });
    }

    let hostLocationDeletions: { userId: number; eventTypeId: number }[] = [];

    // TODO: Delta-based host changes path (Setup Tab) — disabled for now to prevent
    // regression. The dual-write pattern writes both hosts[] and delta fields to the
    // form, but until all tabs use the Zustand store, the backend must only use the
    // legacy hosts[] path. The delta fields are sent but ignored. Re-enable this path
    // once all tabs are migrated to the Zustand store and the backend can safely
    // prefer deltas over hosts[].
    //
    // const mergedPendingChanges = this.mergePendingHostChanges(pendingHostChanges, pendingFixedHostChanges);
    // See mergePendingHostChanges() at the bottom of this class for the merge logic.
    const mergedPendingChanges = null; // Force legacy path for now

    if (teamId && hosts) {
      const teamMemberIds = await this.deps.membershipRepository.listAcceptedTeamMemberIds({ teamId });
      const teamMemberIdSet = new Set(teamMemberIds);
      if (!hosts.every((host) => teamMemberIdSet.has(host.userId)) && !eventType.team?.parentId) {
        throw ErrorWithCode.Factory.Forbidden("Not all hosts are accepted team members");
      }

      const oldHostsSet = new Set(eventType.hosts.map((oldHost) => oldHost.userId));
      const newHostsSet = new Set(hosts.map((oldHost) => oldHost.userId));

      const existingHosts = hosts.filter((newHost) => oldHostsSet.has(newHost.userId));
      hostLocationDeletions = existingHosts
        .filter((host) => host.location === null)
        .map((host) => ({ userId: host.userId, eventTypeId: id }));
      const newHosts = hosts.filter((newHost) => !oldHostsSet.has(newHost.userId));
      const removedHosts = eventType.hosts.filter((oldHost) => !newHostsSet.has(oldHost.userId));

      if (hosts.length === 0) {
        data.enablePerHostLocations = false;
      }

      data.hosts = {
        deleteMany: {
          OR: removedHosts.map((host) => ({
            userId: host.userId,
            eventTypeId: id,
          })),
        },
        create: newHosts.map((host) => {
          const hostData: {
            userId: number;
            isFixed: boolean;
            priority: number;
            weight: number;
            groupId: string | null | undefined;
            scheduleId?: number | null | undefined;
            location?: {
              create: {
                type: string;
                credentialId: number | null | undefined;
                link: string | null | undefined;
                address: string | null | undefined;
                phoneNumber: string | null | undefined;
              };
            };
          } = {
            userId: host.userId,
            isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed || false,
            priority: host.priority ?? 2,
            weight: host.weight ?? 100,
            groupId: host.groupId,
            scheduleId: host.scheduleId ?? null,
          };
          if (host.location) {
            hostData.location = {
              create: {
                type: host.location.type,
                credentialId: host.location.credentialId,
                link: host.location.link,
                address: host.location.address,
                phoneNumber: host.location.phoneNumber,
              },
            };
          }
          return hostData;
        }),
        update: existingHosts.map((host) => {
          const updateData: {
            isFixed: boolean | undefined;
            priority: number;
            weight: number;
            scheduleId: number | null | undefined;
            groupId: string | null | undefined;
            location?: {
              upsert: {
                create: {
                  type: string;
                  credentialId: number | null | undefined;
                  link: string | null | undefined;
                  address: string | null | undefined;
                  phoneNumber: string | null | undefined;
                };
                update: {
                  type: string;
                  credentialId: number | null | undefined;
                  link: string | null | undefined;
                  address: string | null | undefined;
                  phoneNumber: string | null | undefined;
                };
              };
            };
          } = {
            isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
            priority: host.priority ?? 2,
            weight: host.weight ?? 100,
            scheduleId: host.scheduleId === undefined ? undefined : host.scheduleId,
            groupId: host.groupId,
          };
          if (host.location) {
            updateData.location = {
              upsert: {
                create: {
                  type: host.location.type,
                  credentialId: host.location.credentialId,
                  link: host.location.link,
                  address: host.location.address,
                  phoneNumber: host.location.phoneNumber,
                },
                update: {
                  type: host.location.type,
                  credentialId: host.location.credentialId,
                  link: host.location.link,
                  address: host.location.address,
                  phoneNumber: host.location.phoneNumber,
                },
              },
            };
          }
          return {
            where: {
              userId_eventTypeId: {
                userId: host.userId,
                eventTypeId: id,
              },
            },
            data: updateData,
          };
        }),
      };
    }

    if (input.metadata?.disableStandardEmails?.all) {
      if (!eventType?.team?.parentId) {
        input.metadata.disableStandardEmails.all.host = false;
        input.metadata.disableStandardEmails.all.attendee = false;
      }
    }

    if (input.metadata?.disableStandardEmails?.confirmation) {
      const workflows = await this.deps.eventTypeRepository.findWorkflowsByEventTypeIdAndTrigger({
        eventTypeId: input.id,
        trigger: WorkflowTriggerEvents.NEW_EVENT,
      });

      if (input.metadata?.disableStandardEmails.confirmation?.host) {
        if (!allowDisablingHostConfirmationEmails(workflows)) {
          input.metadata.disableStandardEmails.confirmation.host = false;
        }
      }

      if (input.metadata?.disableStandardEmails.confirmation?.attendee) {
        if (!allowDisablingAttendeeConfirmationEmails(workflows)) {
          input.metadata.disableStandardEmails.confirmation.attendee = false;
        }
      }
    }

    const apps = eventTypeAppMetadataOptionalSchema.parse(input.metadata?.apps);
    for (const appKey in apps) {
      const app = apps[appKey as keyof typeof appDataSchemas];
      if (app.enabled && app.price && app.currency) {
        data.price = app.price;
        data.currency = app.currency;
        break;
      }
    }

    const connectedLinks = await this.deps.hashedLinkService.listLinksByEventType(input.id);
    const connectedMultiplePrivateLinks = connectedLinks.map((link: { link: string }) => link.link);

    await this.deps.hashedLinkService.handleMultiplePrivateLinks({
      eventTypeId: input.id,
      multiplePrivateLinks,
      connectedMultiplePrivateLinks,
    });

    if (assignAllTeamMembers !== undefined) {
      data.assignAllTeamMembers = assignAllTeamMembers;
    }

    if (secondaryEmailId) {
      const secondaryEmail = await this.deps.eventTypeRepository.findVerifiedSecondaryEmail({
        id: secondaryEmailId,
        userId: user.id,
      });
      if (secondaryEmail?.emailVerified) {
        data.secondaryEmail = { connect: { id: secondaryEmailId } };
      } else if (secondaryEmailId === -1) {
        data.secondaryEmail = { disconnect: true };
      }
    }

    if (aiPhoneCallConfig) {
      if (aiPhoneCallConfig.enabled) {
        await this.deps.eventTypeRepository.upsertAIPhoneCallConfig({
          eventTypeId: id,
          config: {
            ...aiPhoneCallConfig,
            guestEmail: aiPhoneCallConfig.guestEmail || null,
            guestCompany: aiPhoneCallConfig.guestCompany || null,
          },
        });
      } else if (!aiPhoneCallConfig.enabled && eventType.aiPhoneCallConfig) {
        await this.deps.eventTypeRepository.deleteAIPhoneCallConfig({ eventTypeId: id });
      }
    }

    if (calVideoSettings) {
      await CalVideoSettingsRepository.createOrUpdateCalVideoSettings({
        eventTypeId: id,
        calVideoSettings,
      });
    }

    const parsedEventTypeLocations = eventTypeLocations.safeParse(eventType.locations ?? []);

    const isCalVideoLocationActive = locations
      ? locations.some((location) => location.type === DailyLocationType)
      : parsedEventTypeLocations.success &&
        parsedEventTypeLocations.data?.some((location) => location.type === DailyLocationType);

    if (eventType.calVideoSettings && !isCalVideoLocationActive) {
      await CalVideoSettingsRepository.deleteCalVideoSettings(id);
    }

    const hasNoDescriptionTranslations =
      eventType.fieldTranslations.filter((trans) => trans.field === EventTypeAutoTranslatedField.DESCRIPTION)
        .length === 0;
    const description = newDescription ?? (hasNoDescriptionTranslations ? eventType.description : undefined);
    const hasNoTitleTranslations =
      eventType.fieldTranslations.filter((trans) => trans.field === EventTypeAutoTranslatedField.TITLE)
        .length === 0;
    const title = newTitle ?? (hasNoTitleTranslations ? eventType.title : undefined);

    if (user.organizationId && autoTranslateDescriptionEnabled && (title || description)) {
      await tasker.create("translateEventTypeData", {
        eventTypeId: id,
        description,
        title,
        userLocale: user.locale,
        userId: user.id,
      });
    }

    const updatedEventTypeSelect = {
      slug: true,
      schedulingType: true,
    } satisfies Prisma.EventTypeSelect;

    type UpdatedEventTypeResult = {
      slug: string;
      schedulingType: import("@calcom/prisma/enums").SchedulingType | null;
    };

    let updatedEventType: UpdatedEventTypeResult;
    try {
      updatedEventType = (await this.deps.eventTypeRepository.updateById({
        id,
        data,
        select: updatedEventTypeSelect,
      })) as UpdatedEventTypeResult;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw ErrorWithCode.Factory.BadRequest("error_event_type_url_duplicate");
        }
      }
      throw e;
    }

    if (hostLocationDeletions.length > 0) {
      await this.deps.eventTypeRepository.deleteHostLocations(hostLocationDeletions);
    }

    const updatedValues = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // @ts-expect-error Element implicitly has any type
        acc[key] = value;
      }
      return acc;
    }, {});

    let calVideoSettingsForChildren: typeof calVideoSettings | null | undefined;
    if (calVideoSettings !== undefined) {
      calVideoSettingsForChildren = calVideoSettings;
    } else if (eventType.calVideoSettings && !isCalVideoLocationActive) {
      calVideoSettingsForChildren = null;
    }

    await updateChildrenEventTypes({
      eventTypeId: id,
      currentUserId: user.id,
      oldEventType: eventType,
      updatedEventType,
      children,
      profileId: user.profile.id ?? null,
      prisma: this.deps.prisma,
      updatedValues,
      calVideoSettings: calVideoSettingsForChildren,
    });

    if (hostGroups !== undefined || hosts || mergedPendingChanges) {
      await this.deps.eventTypeRepository.deleteEmptyHostGroups({ eventTypeId: id });
    }

    // Scan redirect URL for malicious content if URL scanning is enabled
    if (isUrlScanningEnabled() && rest.successRedirectUrl) {
      await submitUrlForUrlScanning(rest.successRedirectUrl, user.id, id);
    }

    if (res && typeof res.revalidate !== "undefined") {
      try {
        await res.revalidate(`/${user.username}/${updatedEventType.slug}`);
      } catch (e) {
        logger.debug((e as Error)?.message);
      }
    }

    // Abuse scoring — async, fail-open
    import("@calcom/features/abuse-scoring/lib/hooks")
      .then(({ onEventTypeChange }) => onEventTypeChange(user.id))
      .catch((err) => console.error("abuse-scoring: onEventTypeChange failed to load", err));

    return { eventType };
  }

  /**
   * Merges RR and fixed pending host changes into a single delta object.
   * Returns null if neither has changes, so the legacy hosts[] path runs instead.
   */
  private mergePendingHostChanges(
    pendingHostChanges?: PendingHostChangesInput,
    pendingFixedHostChanges?: PendingHostChangesInput
  ): PendingHostChangesInput | null {
    if (!pendingHostChanges && !pendingFixedHostChanges) return null;

    const merged: PendingHostChangesInput = {
      hostsToAdd: [
        ...(pendingHostChanges?.hostsToAdd ?? []),
        ...(pendingFixedHostChanges?.hostsToAdd ?? []),
      ],
      hostsToUpdate: [
        ...(pendingHostChanges?.hostsToUpdate ?? []),
        ...(pendingFixedHostChanges?.hostsToUpdate ?? []),
      ],
      hostsToRemove: [
        ...(pendingHostChanges?.hostsToRemove ?? []),
        ...(pendingFixedHostChanges?.hostsToRemove ?? []),
      ],
      clearAllHosts: pendingHostChanges?.clearAllHosts || pendingFixedHostChanges?.clearAllHosts,
      clearAllHostLocations:
        pendingHostChanges?.clearAllHostLocations || pendingFixedHostChanges?.clearAllHostLocations,
    };

    // If there are no actual changes, return null so legacy path runs
    const hasChanges =
      merged.hostsToAdd.length > 0 ||
      merged.hostsToUpdate.length > 0 ||
      merged.hostsToRemove.length > 0 ||
      merged.clearAllHosts ||
      merged.clearAllHostLocations;

    return hasChanges ? merged : null;
  }
}
