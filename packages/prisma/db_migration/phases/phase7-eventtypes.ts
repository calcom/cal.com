import type { MigrationContext } from "../types";

export async function migrateEventTypes(ctx: MigrationContext) {
  ctx.log("Migrating EventTypes...");

  const oldEventTypes = await ctx.oldDb.eventType.findMany();

  await ctx.processBatch(oldEventTypes, async (batch) => {
    const newEventTypes = await Promise.all(
      batch.map(async (oldEventType: any) => {
        try {
          const userId = oldEventType.userId ? ctx.idMappings.users[oldEventType.userId.toString()] : null;
          const profileId = oldEventType.profileId
            ? ctx.idMappings.profiles[oldEventType.profileId.toString()]
            : null;
          const calIdTeamId = oldEventType.teamId
            ? ctx.idMappings.calIdTeams[oldEventType.teamId.toString()]
            : null;
          const scheduleId = oldEventType.scheduleId
            ? ctx.idMappings.schedules[oldEventType.scheduleId.toString()]
            : null;
          const secondaryEmailId = oldEventType.secondaryEmailId
            ? ctx.idMappings.secondaryEmails[oldEventType.secondaryEmailId.toString()]
            : null;

          const newEventType = await ctx.newDb.eventType.create({
            data: {
              title: oldEventType.title,
              slug: oldEventType.slug,
              description: oldEventType.description,
              interfaceLanguage: oldEventType.interfaceLanguage,
              position: oldEventType.position,
              locations: oldEventType.locations,
              length: oldEventType.length,
              offsetStart: oldEventType.offsetStart,
              hidden: oldEventType.hidden,
              userId: userId,
              profileId: profileId,
              calIdTeamId: calIdTeamId,
              eventName: oldEventType.eventName,
              bookingFields: oldEventType.bookingFields,
              timeZone: oldEventType.timeZone,
              periodType: oldEventType.periodType,
              periodStartDate: oldEventType.periodStartDate,
              periodEndDate: oldEventType.periodEndDate,
              periodDays: oldEventType.periodDays,
              periodCountCalendarDays: oldEventType.periodCountCalendarDays,
              lockTimeZoneToggleOnBookingPage: oldEventType.lockTimeZoneToggleOnBookingPage,
              lockedTimeZone: oldEventType.lockedTimeZone,
              requiresConfirmation: oldEventType.requiresConfirmation,
              requiresConfirmationWillBlockSlot: oldEventType.requiresConfirmationWillBlockSlot,
              requiresConfirmationForFreeEmail: oldEventType.requiresConfirmationForFreeEmail,
              requiresBookerEmailVerification: oldEventType.requiresBookerEmailVerification,
              canSendCalVideoTranscriptionEmails: oldEventType.canSendCalVideoTranscriptionEmails ?? true,
              autoTranslateDescriptionEnabled: oldEventType.autoTranslateDescriptionEnabled,
              recurringEvent: oldEventType.recurringEvent,
              disableGuests: oldEventType.disableGuests,
              hideCalendarNotes: oldEventType.hideCalendarNotes,
              hideCalendarEventDetails: oldEventType.hideCalendarEventDetails,
              minimumBookingNotice: oldEventType.minimumBookingNotice,
              beforeEventBuffer: oldEventType.beforeEventBuffer,
              afterEventBuffer: oldEventType.afterEventBuffer,
              seatsPerTimeSlot: oldEventType.seatsPerTimeSlot,
              onlyShowFirstAvailableSlot: oldEventType.onlyShowFirstAvailableSlot,
              disableCancelling: oldEventType.disableCancelling,
              disableRescheduling: oldEventType.disableRescheduling,
              seatsShowAttendees: oldEventType.seatsShowAttendees,
              seatsShowAvailabilityCount: oldEventType.seatsShowAvailabilityCount,
              schedulingType: oldEventType.schedulingType,
              scheduleId: scheduleId,
              allowReschedulingCancelledBookings: oldEventType.allowReschedulingCancelledBookings,
              price: oldEventType.price,
              currency: oldEventType.currency,
              slotInterval: oldEventType.slotInterval,
              metadata: oldEventType.metadata,
              successRedirectUrl: oldEventType.successRedirectUrl,
              forwardParamsSuccessRedirect: oldEventType.forwardParamsSuccessRedirect,
              bookingLimits: oldEventType.bookingLimits,
              durationLimits: oldEventType.durationLimits,
              isInstantEvent: oldEventType.isInstantEvent,
              instantMeetingExpiryTimeOffsetInSeconds: oldEventType.instantMeetingExpiryTimeOffsetInSeconds,
              instantMeetingParameters: oldEventType.instantMeetingParameters,
              assignAllTeamMembers: oldEventType.assignAllTeamMembers,
              assignRRMembersUsingSegment: oldEventType.assignRRMembersUsingSegment,
              rrSegmentQueryValue: oldEventType.rrSegmentQueryValue,
              useEventTypeDestinationCalendarEmail: oldEventType.useEventTypeDestinationCalendarEmail,
              isRRWeightsEnabled: oldEventType.isRRWeightsEnabled,
              maxLeadThreshold: oldEventType.maxLeadThreshold,
              includeNoShowInRRCalculation: oldEventType.includeNoShowInRRCalculation,
              allowReschedulingPastBookings: oldEventType.allowReschedulingPastBookings,
              hideOrganizerEmail: oldEventType.hideOrganizerEmail,
              maxActiveBookingsPerBooker: oldEventType.maxActiveBookingsPerBooker,
              maxActiveBookingPerBookerOfferReschedule: oldEventType.maxActiveBookingPerBookerOfferReschedule,
              customReplyToEmail: oldEventType.customReplyToEmail,
              eventTypeColor: oldEventType.eventTypeColor,
              rescheduleWithSameRoundRobinHost: oldEventType.rescheduleWithSameRoundRobinHost,
              secondaryEmailId: secondaryEmailId,
              useBookerTimezone: oldEventType.useBookerTimezone,
              parentId: oldEventType.parentId,
              useEventLevelSelectedCalendars: false,
              captchaType: oldEventType.captchaType,
            },
          });

          ctx.idMappings.eventTypes[oldEventType.id.toString()] = newEventType.id;
          return newEventType;
        } catch (error) {
          ctx.logError(`Failed to migrate event type ${oldEventType.id}`, error);
          return null;
        }
      })
    );
    return newEventTypes.filter(Boolean);
  });

  ctx.log(`Migrated ${oldEventTypes.length} event types`);
}

export async function migrateEventTypeCustomInputs(ctx: MigrationContext) {
  ctx.log("Migrating Event Type Custom Inputs...");

  const oldInputs = await ctx.oldDb.eventTypeCustomInput.findMany();

  await ctx.processBatch(oldInputs, async (batch) => {
    const newInputs = await Promise.all(
      batch.map(async (oldInput: any) => {
        try {
          const eventTypeId = ctx.idMappings.eventTypes[oldInput.eventTypeId.toString()];

          if (!eventTypeId) {
            ctx.log(`Skipping custom input ${oldInput.id} - event type not found`);
            return null;
          }

          const newInput = await ctx.newDb.eventTypeCustomInput.create({
            data: {
              eventTypeId: eventTypeId,
              label: oldInput.label,
              type: oldInput.type,
              options: oldInput.options,
              required: oldInput.required,
              placeholder: oldInput.placeholder,
            },
          });

          return newInput;
        } catch (error) {
          ctx.logError(`Failed to migrate custom input ${oldInput.id}`, error);
          return null;
        }
      })
    );
    return newInputs.filter(Boolean);
  });

  ctx.log(`Migrated ${oldInputs.length} event type custom inputs`);
}

export async function migrateHosts(ctx: MigrationContext) {
  ctx.log("Migrating Hosts...");

  const oldHosts = await ctx.oldDb.host.findMany();

  await ctx.processBatch(oldHosts, async (batch) => {
    const newHosts = await Promise.all(
      batch.map(async (oldHost: any) => {
        try {
          const userId = ctx.idMappings.users[oldHost.userId.toString()];
          const eventTypeId = ctx.idMappings.eventTypes[oldHost.eventTypeId.toString()];
          const scheduleId = oldHost.scheduleId
            ? ctx.idMappings.schedules[oldHost.scheduleId.toString()]
            : null;

          if (!userId || !eventTypeId) {
            ctx.log(`Skipping host ${oldHost.userId}-${oldHost.eventTypeId} - user or event type not found`);
            return null;
          }

          const newHost = await ctx.newDb.host.create({
            data: {
              userId: userId,
              eventTypeId: eventTypeId,
              isFixed: oldHost.isFixed,
              priority: oldHost.priority,
              weight: oldHost.weight,
              weightAdjustment: oldHost.weightAdjustment,
              scheduleId: scheduleId,
              createdAt: oldHost.createdAt,
            },
          });

          return newHost;
        } catch (error) {
          ctx.logError(`Failed to migrate host ${oldHost.userId}-${oldHost.eventTypeId}`, error);
          return null;
        }
      })
    );
    return newHosts.filter(Boolean);
  });

  ctx.log(`Migrated ${oldHosts.length} hosts`);
}

export async function migrateHashedLinks(ctx: MigrationContext) {
  ctx.log("Migrating Hashed Links...");

  const oldLinks = await ctx.oldDb.hashedLink.findMany();

  await ctx.processBatch(oldLinks, async (batch) => {
    const newLinks = await Promise.all(
      batch.map(async (oldLink: any) => {
        try {
          const eventTypeId = ctx.idMappings.eventTypes[oldLink.eventTypeId.toString()];

          if (!eventTypeId) {
            ctx.log(`Skipping hashed link ${oldLink.id} - event type not found`);
            return null;
          }

          const newLink = await ctx.newDb.hashedLink.create({
            data: {
              link: oldLink.link,
              eventTypeId: eventTypeId,
              expiresAt: oldLink.expiresAt,
              maxUsageCount: oldLink.maxUsageCount || 1,
              usageCount: oldLink.usageCount || 0,
            },
          });

          return newLink;
        } catch (error) {
          ctx.logError(`Failed to migrate hashed link ${oldLink.id}`, error);
          return null;
        }
      })
    );
    return newLinks.filter(Boolean);
  });

  ctx.log(`Migrated ${oldLinks.length} hashed links`);
}

export async function runPhase7(ctx: MigrationContext) {
  ctx.log("=== PHASE 7: Event Types & Configuration ===");
  await migrateEventTypes(ctx);
  await migrateEventTypeCustomInputs(ctx);
  await migrateHosts(ctx);
  await migrateHashedLinks(ctx);
}
