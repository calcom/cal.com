import { PrismaClient as NewPrismaClient } from "@prisma/client";
import { PrismaClient as OldPrismaClient } from "@prisma/client";

// Initialize both Prisma clients
const oldDb = new OldPrismaClient({
  datasources: {
    db: {
      url: process.env.OLD_DATABASE_URL!,
    },
  },
});

const newDb = new NewPrismaClient({
  datasources: {
    db: {
      url: process.env.NEW_DATABASE_URL!,
    },
  },
});

// Enhanced ID mapping storage with proper typing
interface IdMapping {
  [oldId: string]: number;
}

const idMappings = {
  // Core entities
  users: {} as IdMapping,
  profiles: {} as IdMapping,
  schedules: {} as IdMapping,

  // CalId entities (new structure)
  calIdTeams: {} as IdMapping,
  calIdMemberships: {} as IdMapping,
  calIdWorkflows: {} as IdMapping,
  calIdWorkflowSteps: {} as IdMapping,
  calIdTeamFeatures: {} as IdMapping,

  // Other entities
  credentials: {} as IdMapping,
  eventTypes: {} as IdMapping,
  availabilities: {} as IdMapping,
  apps: {} as IdMapping,
  features: {} as IdMapping,
  roles: {} as IdMapping,
  apiKeys: {} as IdMapping,
  attributes: {} as IdMapping,
};

// Logging utility
function log(message: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function logError(message: string, error: any) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
  console.error(error);
}

// Batch processing utility
async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize = 50 // Reduced batch size for better reliability
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    log(
      `Processed batch ${Math.ceil((i + batchSize) / batchSize)} of ${Math.ceil(items.length / batchSize)}`
    );
  }
  return results;
}

// ===============================
// PHASE 1: CORE ENTITIES (NO DEPENDENCIES)
// ===============================

async function migrateApps() {
  log("Migrating Apps...");

  const oldApps = await oldDb.app.findMany();

  await processBatch(oldApps, async (batch) => {
    const newApps = await Promise.all(
      batch.map(async (oldApp) => {
        try {
          const newApp = await newDb.app.create({
            data: {
              slug: oldApp.slug,
              dirName: oldApp.dirName,
              keys: oldApp.keys,
              categories: oldApp.categories,
              createdAt: oldApp.createdAt,
              updatedAt: oldApp.updatedAt,
              enabled: oldApp.enabled,
            },
          });
          return newApp;
        } catch (error) {
          logError(`Failed to migrate app ${oldApp.slug}`, error);
          return null;
        }
      })
    );
    return newApps.filter(Boolean);
  });

  log(`Migrated ${oldApps.length} apps`);
}

async function migrateFeatures() {
  log("Migrating Features...");

  const oldFeatures = await oldDb.feature.findMany();

  await processBatch(oldFeatures, async (batch) => {
    const newFeatures = await Promise.all(
      batch.map(async (oldFeature) => {
        try {
          const newFeature = await newDb.feature.create({
            data: {
              slug: oldFeature.slug,
              enabled: oldFeature.enabled,
              description: oldFeature.description,
              type: oldFeature.type,
              stale: oldFeature.stale,
              lastUsedAt: oldFeature.lastUsedAt,
              createdAt: oldFeature.createdAt,
              updatedAt: oldFeature.updatedAt,
              updatedBy: oldFeature.updatedBy,
            },
          });
          return newFeature;
        } catch (error) {
          logError(`Failed to migrate feature ${oldFeature.slug}`, error);
          return null;
        }
      })
    );
    return newFeatures.filter(Boolean);
  });

  log(`Migrated ${oldFeatures.length} features`);
}

async function migrateUsers() {
  log("Migrating Users...");

  const oldUsers = await oldDb.user.findMany({
    include: {
      password: true,
      travelSchedules: true,
    },
  });

  await processBatch(oldUsers, async (batch) => {
    const newUsers = await Promise.all(
      batch.map(async (oldUser) => {
        try {
          // Create user with proper field mapping
          const newUser = await newDb.user.create({
            data: {
              username: oldUser.username,
              name: oldUser.name,
              email: oldUser.email,
              emailVerified: oldUser.emailVerified,
              bio: oldUser.bio,
              avatarUrl: oldUser.avatarUrl,
              timeZone: oldUser.timeZone || "Asia/Kolkata", // Default timezone change
              weekStart: oldUser.weekStart || "Monday", // Default weekStart change
              startTime: oldUser.startTime,
              endTime: oldUser.endTime,
              bufferTime: oldUser.bufferTime,
              hideBranding: oldUser.hideBranding,
              theme: oldUser.theme,
              appTheme: oldUser.appTheme,
              createdDate: oldUser.createdDate,
              trialEndsAt: oldUser.trialEndsAt,
              lastActiveAt: oldUser.lastActiveAt,
              completedOnboarding: oldUser.completedOnboarding,
              locale: oldUser.locale,
              timeFormat: oldUser.timeFormat,
              twoFactorSecret: oldUser.twoFactorSecret,
              twoFactorEnabled: oldUser.twoFactorEnabled,
              backupCodes: oldUser.backupCodes,
              identityProvider: oldUser.identityProvider,
              identityProviderId: oldUser.identityProviderId,
              invitedTo: oldUser.invitedTo,
              brandColor: oldUser.brandColor,
              darkBrandColor: oldUser.darkBrandColor,
              allowDynamicBooking: oldUser.allowDynamicBooking,
              allowSEOIndexing: oldUser.allowSEOIndexing,
              receiveMonthlyDigestEmail: oldUser.receiveMonthlyDigestEmail,
              metadata: oldUser.metadata,
              verified: oldUser.verified,
              role: oldUser.role,
              disableImpersonation: oldUser.disableImpersonation,
              organizationId: oldUser.organizationId,
              locked: oldUser.locked,
              movedToProfileId: oldUser.movedToProfileId,
              isPlatformManaged: oldUser.isPlatformManaged,
              smsLockState: oldUser.smsLockState,
              smsLockReviewedByAdmin: oldUser.smsLockReviewedByAdmin,
              referralLinkId: oldUser.referralLinkId,
              creationSource: oldUser.creationSource,
              whitelistWorkflows: oldUser.whitelistWorkflows || false, // New field with default
            },
          });

          // Create password if exists
          if (oldUser.password) {
            await newDb.userPassword.create({
              data: {
                userId: newUser.id,
                hash: oldUser.password.hash,
                salt: oldUser.password.salt,
              },
            });
          }

          // Create travel schedules
          if (oldUser.travelSchedules && oldUser.travelSchedules.length > 0) {
            await Promise.all(
              oldUser.travelSchedules.map((schedule) =>
                newDb.travelSchedule.create({
                  data: {
                    userId: newUser.id,
                    timeZone: schedule.timeZone,
                    startDate: schedule.startDate,
                    endDate: schedule.endDate,
                    prevTimeZone: schedule.prevTimeZone,
                  },
                })
              )
            );
          }

          idMappings.users[oldUser.id.toString()] = newUser.id;
          return newUser;
        } catch (error) {
          logError(`Failed to migrate user ${oldUser.id}`, error);
          return null;
        }
      })
    );
    return newUsers.filter(Boolean);
  });

  log(`Migrated ${oldUsers.length} users`);
}

// ===============================
// PHASE 2: CALID TEAMS (REPLACES TEAMS)
// ===============================

async function migrateCalIdTeams() {
  log("Migrating Team → CalIdTeam...");

  const oldTeams = await oldDb.team.findMany({
    include: {
      organizationSettings: true,
      platformBilling: true,
    },
  });

  await processBatch(oldTeams, async (batch) => {
    const newTeams = await Promise.all(
      batch.map(async (oldTeam) => {
        try {
          const newTeam = await newDb.calIdTeam.create({
            data: {
              name: oldTeam.name,
              slug: oldTeam.slug,
              logoUrl: oldTeam.logoUrl,
              bio: oldTeam.bio,
              hideTeamBranding: oldTeam.hideBranding || false,
              hideTeamProfileLink: oldTeam.hideBookATeamMember || false,
              isTeamPrivate: oldTeam.isPrivate || false,
              hideBookATeamMember: oldTeam.hideBookATeamMember || false,
              metadata: oldTeam.metadata,
              theme: oldTeam.theme,
              brandColor: oldTeam.brandColor,
              darkBrandColor: oldTeam.darkBrandColor,
              timeFormat: oldTeam.timeFormat,
              timeZone: oldTeam.timeZone || "Asia/Kolkata", // Default timezone
              weekStart: oldTeam.weekStart || "Monday", // Default weekStart
              bookingFrequency: oldTeam.bookingLimits, // Map bookingLimits to bookingFrequency
              createdAt: oldTeam.createdAt,
              updatedAt: new Date(),
            },
          });

          idMappings.calIdTeams[oldTeam.id.toString()] = newTeam.id;
          return newTeam;
        } catch (error) {
          logError(`Failed to migrate team ${oldTeam.id}`, error);
          return null;
        }
      })
    );
    return newTeams.filter(Boolean);
  });

  log(`Migrated ${oldTeams.length} teams to CalIdTeams`);
}

async function migrateCalIdMemberships() {
  log("Migrating Membership → CalIdMembership...");

  const oldMemberships = await oldDb.membership.findMany();

  await processBatch(oldMemberships, async (batch) => {
    const newMemberships = await Promise.all(
      batch.map(async (oldMembership) => {
        try {
          const calIdTeamId = idMappings.calIdTeams[oldMembership.teamId.toString()];
          const userId = idMappings.users[oldMembership.userId.toString()];

          if (!calIdTeamId) {
            log(`Skipping membership ${oldMembership.id} - team not found in mapping`);
            return null;
          }

          if (!userId) {
            log(`Skipping membership ${oldMembership.id} - user not found in mapping`);
            return null;
          }

          // Map MembershipRole to CalIdMembershipRole
          let role: "MEMBER" | "ADMIN" | "OWNER";
          switch (oldMembership.role) {
            case "MEMBER":
              role = "MEMBER";
              break;
            case "ADMIN":
              role = "ADMIN";
              break;
            case "OWNER":
              role = "OWNER";
              break;
            default:
              role = "MEMBER";
          }

          const newMembership = await newDb.calIdMembership.create({
            data: {
              calIdTeamId,
              userId,
              acceptedInvitation: oldMembership.accepted,
              role,
              impersonation: !oldMembership.disableImpersonation,
              createdAt: oldMembership.createdAt || new Date(),
              updatedAt: oldMembership.updatedAt || new Date(),
            },
          });

          idMappings.calIdMemberships[oldMembership.id.toString()] = newMembership.id;
          return newMembership;
        } catch (error) {
          logError(`Failed to migrate membership ${oldMembership.id}`, error);
          return null;
        }
      })
    );
    return newMemberships.filter(Boolean);
  });

  log(`Migrated memberships to CalIdMemberships`);
}

// ===============================
// PHASE 3: SCHEDULES AND PROFILES
// ===============================

async function migrateSchedules() {
  log("Migrating Schedules...");

  const oldSchedules = await oldDb.schedule.findMany();

  await processBatch(oldSchedules, async (batch) => {
    const newSchedules = await Promise.all(
      batch.map(async (oldSchedule) => {
        try {
          const userId = idMappings.users[oldSchedule.userId.toString()];
          if (!userId) {
            log(`Skipping schedule ${oldSchedule.id} - user not found`);
            return null;
          }

          const newSchedule = await newDb.schedule.create({
            data: {
              userId: userId,
              name: oldSchedule.name,
              timeZone: oldSchedule.timeZone,
            },
          });

          idMappings.schedules[oldSchedule.id.toString()] = newSchedule.id;
          return newSchedule;
        } catch (error) {
          logError(`Failed to migrate schedule ${oldSchedule.id}`, error);
          return null;
        }
      })
    );
    return newSchedules.filter(Boolean);
  });

  log(`Migrated ${oldSchedules.length} schedules`);
}

async function migrateProfiles() {
  log("Migrating Profiles...");

  const oldProfiles = await oldDb.profile.findMany();

  await processBatch(oldProfiles, async (batch) => {
    const newProfiles = await Promise.all(
      batch.map(async (oldProfile) => {
        try {
          const userId = idMappings.users[oldProfile.userId.toString()];
          const orgId = idMappings.calIdTeams[oldProfile.organizationId.toString()];

          if (!userId) {
            log(`Skipping profile ${oldProfile.id} - user not found`);
            return null;
          }

          if (!orgId) {
            log(`Skipping profile ${oldProfile.id} - organization not found`);
            return null;
          }

          const newProfile = await newDb.profile.create({
            data: {
              uid: oldProfile.uid,
              userId: userId,
              organizationId: orgId,
              username: oldProfile.username,
              createdAt: oldProfile.createdAt,
              updatedAt: oldProfile.updatedAt,
            },
          });

          idMappings.profiles[oldProfile.id.toString()] = newProfile.id;
          return newProfile;
        } catch (error) {
          logError(`Failed to migrate profile ${oldProfile.id}`, error);
          return null;
        }
      })
    );
    return newProfiles.filter(Boolean);
  });

  log(`Migrated ${oldProfiles.length} profiles`);
}

// ===============================
// PHASE 4: CREDENTIALS AND AVAILABILITIES
// ===============================

async function migrateCredentials() {
  log("Migrating Credentials...");

  const oldCredentials = await oldDb.credential.findMany();

  await processBatch(oldCredentials, async (batch) => {
    const newCredentials = await Promise.all(
      batch.map(async (oldCredential) => {
        try {
          const userId = oldCredential.userId ? idMappings.users[oldCredential.userId.toString()] : null;
          const calIdTeamId = oldCredential.teamId
            ? idMappings.calIdTeams[oldCredential.teamId.toString()]
            : null;

          const newCredential = await newDb.credential.create({
            data: {
              type: oldCredential.type,
              key: oldCredential.key,
              userId: userId,
              calIdTeamId: calIdTeamId, // Use CalIdTeam instead of Team
              appId: oldCredential.appId,
              subscriptionId: oldCredential.subscriptionId,
              paymentStatus: oldCredential.paymentStatus,
              billingCycleStart: oldCredential.billingCycleStart,
              invalid: oldCredential.invalid,
              delegationCredentialId: oldCredential.delegationCredentialId,
            },
          });

          idMappings.credentials[oldCredential.id.toString()] = newCredential.id;
          return newCredential;
        } catch (error) {
          logError(`Failed to migrate credential ${oldCredential.id}`, error);
          return null;
        }
      })
    );
    return newCredentials.filter(Boolean);
  });

  log(`Migrated ${oldCredentials.length} credentials`);
}

async function migrateAvailabilities() {
  log("Migrating Availabilities...");

  const oldAvailabilities = await oldDb.availability.findMany();

  await processBatch(oldAvailabilities, async (batch) => {
    const newAvailabilities = await Promise.all(
      batch.map(async (oldAvailability) => {
        try {
          const scheduleId = oldAvailability.scheduleId
            ? idMappings.schedules[oldAvailability.scheduleId.toString()]
            : null;
          const userId = oldAvailability.userId ? idMappings.users[oldAvailability.userId.toString()] : null;

          const newAvailability = await newDb.availability.create({
            data: {
              userId: userId,
              eventTypeId: oldAvailability.eventTypeId,
              days: oldAvailability.days,
              startTime: oldAvailability.startTime,
              endTime: oldAvailability.endTime,
              date: oldAvailability.date,
              scheduleId: scheduleId,
            },
          });

          idMappings.availabilities[oldAvailability.id.toString()] = newAvailability.id;
          return newAvailability;
        } catch (error) {
          logError(`Failed to migrate availability ${oldAvailability.id}`, error);
          return null;
        }
      })
    );
    return newAvailabilities.filter(Boolean);
  });

  log(`Migrated ${oldAvailabilities.length} availabilities`);
}

// ===============================
// PHASE 5: EVENT TYPES AND BOOKINGS
// ===============================

async function migrateEventTypes() {
  log("Migrating EventTypes...");

  const oldEventTypes = await oldDb.eventType.findMany();

  await processBatch(oldEventTypes, async (batch) => {
    const newEventTypes = await Promise.all(
      batch.map(async (oldEventType) => {
        try {
          const userId = oldEventType.userId ? idMappings.users[oldEventType.userId.toString()] : null;
          const profileId = oldEventType.profileId
            ? idMappings.profiles[oldEventType.profileId.toString()]
            : null;
          const calIdTeamId = oldEventType.teamId
            ? idMappings.calIdTeams[oldEventType.teamId.toString()]
            : null;
          const scheduleId = oldEventType.scheduleId
            ? idMappings.schedules[oldEventType.scheduleId.toString()]
            : null;
          const restrictionScheduleId = oldEventType.restrictionScheduleId
            ? idMappings.schedules[oldEventType.restrictionScheduleId.toString()]
            : null;
          const instantMeetingScheduleId = oldEventType.instantMeetingScheduleId
            ? idMappings.schedules[oldEventType.instantMeetingScheduleId.toString()]
            : null;

          const newEventType = await newDb.eventType.create({
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
              calIdTeamId: calIdTeamId, // Use CalIdTeam instead of Team
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
              canSendCalVideoTranscriptionEmails: oldEventType.canSendCalVideoTranscriptionEmails || true, // Default to true for new field
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
              instantMeetingScheduleId: instantMeetingScheduleId,
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
              secondaryEmailId: oldEventType.secondaryEmailId,
              useBookerTimezone: oldEventType.useBookerTimezone,
              restrictionScheduleId: restrictionScheduleId,
              parentId: oldEventType.parentId,
              useEventLevelSelectedCalendars: false, // New field with default
              captchaType: oldEventType.captchaType,
            },
          });

          idMappings.eventTypes[oldEventType.id.toString()] = newEventType.id;
          return newEventType;
        } catch (error) {
          logError(`Failed to migrate event type ${oldEventType.id}`, error);
          return null;
        }
      })
    );
    return newEventTypes.filter(Boolean);
  });

  log(`Migrated ${oldEventTypes.length} event types`);
}

async function migrateBookings() {
  log("Migrating Bookings...");

  const oldBookings = await oldDb.booking.findMany();

  await processBatch(oldBookings, async (batch) => {
    const newBookings = await Promise.all(
      batch.map(async (oldBooking) => {
        try {
          const userId = oldBooking.userId ? idMappings.users[oldBooking.userId.toString()] : null;
          const eventTypeId = oldBooking.eventTypeId
            ? idMappings.eventTypes[oldBooking.eventTypeId.toString()]
            : null;
          const reassignById = oldBooking.reassignById
            ? idMappings.users[oldBooking.reassignById.toString()]
            : null;

          const newBooking = await newDb.booking.create({
            data: {
              uid: oldBooking.uid,
              idempotencyKey: oldBooking.idempotencyKey,
              userId: userId,
              userPrimaryEmail: oldBooking.userPrimaryEmail,
              eventTypeId: eventTypeId,
              title: oldBooking.title,
              description: oldBooking.description,
              customInputs: oldBooking.customInputs,
              responses: oldBooking.responses,
              startTime: oldBooking.startTime,
              endTime: oldBooking.endTime,
              location: oldBooking.location,
              createdAt: oldBooking.createdAt,
              updatedAt: oldBooking.updatedAt,
              status: oldBooking.status,
              paid: oldBooking.paid,
              destinationCalendarId: oldBooking.destinationCalendarId,
              cancellationReason: oldBooking.cancellationReason,
              rejectionReason: oldBooking.rejectionReason,
              reassignReason: oldBooking.reassignReason,
              reassignById: reassignById,
              dynamicEventSlugRef: oldBooking.dynamicEventSlugRef,
              dynamicGroupSlugRef: oldBooking.dynamicGroupSlugRef,
              rescheduled: oldBooking.rescheduled,
              fromReschedule: oldBooking.fromReschedule,
              recurringEventId: oldBooking.recurringEventId,
              smsReminderNumber: oldBooking.smsReminderNumber,
              scheduledJobs: oldBooking.scheduledJobs,
              metadata: oldBooking.metadata,
              isRecorded: oldBooking.isRecorded,
              iCalUID: oldBooking.iCalUID,
              iCalSequence: oldBooking.iCalSequence,
              rating: oldBooking.rating,
              ratingFeedback: oldBooking.ratingFeedback,
              noShowHost: oldBooking.noShowHost,
              oneTimePassword: oldBooking.oneTimePassword,
              cancelledBy: oldBooking.cancelledBy,
              rescheduledBy: oldBooking.rescheduledBy,
              creationSource: oldBooking.creationSource,
            },
          });

          return newBooking;
        } catch (error) {
          logError(`Failed to migrate booking ${oldBooking.id}`, error);
          return null;
        }
      })
    );
    return newBookings.filter(Boolean);
  });

  log(`Migrated ${oldBookings.length} bookings`);
}

// ===============================
// PHASE 6: CALID WORKFLOWS
// ===============================

async function migrateCalIdWorkflows() {
  log("Migrating Workflow → CalIdWorkflow...");

  const oldWorkflows = await oldDb.workflow.findMany({
    include: {
      steps: true,
    },
  });

  await processBatch(oldWorkflows, async (batch) => {
    const newWorkflows = await Promise.all(
      batch.map(async (oldWorkflow) => {
        try {
          const userId = oldWorkflow.userId ? idMappings.users[oldWorkflow.userId.toString()] : null;
          const calIdTeamId = oldWorkflow.teamId
            ? idMappings.calIdTeams[oldWorkflow.teamId.toString()]
            : null;

          const newWorkflow = await newDb.calIdWorkflow.create({
            data: {
              position: oldWorkflow.position,
              name: oldWorkflow.name,
              userId: userId,
              calIdTeamId: calIdTeamId, // Use CalIdTeam instead of Team
              isActiveOnAll: oldWorkflow.isActiveOnAll,
              trigger: oldWorkflow.trigger,
              time: oldWorkflow.time,
              timeUnit: oldWorkflow.timeUnit,
              disabled: false, // Default value for new field
            },
          });

          idMappings.calIdWorkflows[oldWorkflow.id.toString()] = newWorkflow.id;
          return newWorkflow;
        } catch (error) {
          logError(`Failed to migrate workflow ${oldWorkflow.id}`, error);
          return null;
        }
      })
    );
    return newWorkflows.filter(Boolean);
  });

  log(`Migrated ${oldWorkflows.length} workflows to CalIdWorkflows`);
}

async function migrateCalIdWorkflowSteps() {
  log("Migrating WorkflowStep → CalIdWorkflowStep...");

  const oldSteps = await oldDb.workflowStep.findMany();

  await processBatch(oldSteps, async (batch) => {
    const newSteps = await Promise.all(
      batch.map(async (oldStep) => {
        try {
          const calIdWorkflowId = idMappings.calIdWorkflows[oldStep.workflowId.toString()];
          if (!calIdWorkflowId) {
            log(`Skipping workflow step ${oldStep.id} - workflow not found in mapping`);
            return null;
          }

          const newStep = await newDb.calIdWorkflowStep.create({
            data: {
              stepNumber: oldStep.stepNumber,
              action: oldStep.action,
              workflowId: calIdWorkflowId,
              sendTo: oldStep.sendTo,
              reminderBody: oldStep.reminderBody,
              emailSubject: oldStep.emailSubject,
              template: oldStep.template,
              numberRequired: oldStep.numberRequired,
              sender: oldStep.sender,
              numberVerificationPending: oldStep.numberVerificationPending,
              includeCalendarEvent: oldStep.includeCalendarEvent,
              verifiedAt: oldStep.verifiedAt,
            },
          });

          idMappings.calIdWorkflowSteps[oldStep.id.toString()] = newStep.id;
          return newStep;
        } catch (error) {
          logError(`Failed to migrate workflow step ${oldStep.id}`, error);
          return null;
        }
      })
    );
    return newSteps.filter(Boolean);
  });

  log(`Migrated workflow steps to CalIdWorkflowSteps`);
}

// ===============================
// PHASE 7: FEATURES AND RELATIONS
// ===============================

async function migrateUserFeatures() {
  log("Migrating UserFeatures...");

  const oldUserFeatures = await oldDb.userFeatures.findMany();

  await processBatch(oldUserFeatures, async (batch) => {
    const newUserFeatures = await Promise.all(
      batch.map(async (oldUserFeature) => {
        try {
          const userId = idMappings.users[oldUserFeature.userId.toString()];
          if (!userId) {
            log(`Skipping user feature ${oldUserFeature.featureId} - user not found in mapping`);
            return null;
          }

          const newUserFeature = await newDb.userFeatures.create({
            data: {
              userId: userId,
              featureId: oldUserFeature.featureId,
              assignedAt: oldUserFeature.assignedAt,
              assignedBy: oldUserFeature.assignedBy,
              updatedAt: oldUserFeature.updatedAt,
            },
          });

          return newUserFeature;
        } catch (error) {
          logError(
            `Failed to migrate user feature ${oldUserFeature.userId}-${oldUserFeature.featureId}`,
            error
          );
          return null;
        }
      })
    );
    return newUserFeatures.filter(Boolean);
  });

  log(`Migrated user features`);
}

async function migrateCalIdTeamFeatures() {
  log("Migrating TeamFeatures → CalIdTeamFeatures...");

  const oldTeamFeatures = await oldDb.teamFeatures.findMany();

  await processBatch(oldTeamFeatures, async (batch) => {
    const newTeamFeatures = await Promise.all(
      batch.map(async (oldTeamFeature) => {
        try {
          const calIdTeamId = idMappings.calIdTeams[oldTeamFeature.teamId.toString()];
          if (!calIdTeamId) {
            log(
              `Skipping team feature ${oldTeamFeature.teamId}-${oldTeamFeature.featureId} - team not found in mapping`
            );
            return null;
          }

          const newTeamFeature = await newDb.calIdTeamFeatures.create({
            data: {
              calIdTeamId: calIdTeamId,
              featureId: oldTeamFeature.featureId,
              assignedAt: oldTeamFeature.assignedAt,
              assignedBy: oldTeamFeature.assignedBy,
              updatedAt: oldTeamFeature.updatedAt,
            },
          });

          return newTeamFeature;
        } catch (error) {
          logError(
            `Failed to migrate team feature ${oldTeamFeature.teamId}-${oldTeamFeature.featureId}`,
            error
          );
          return null;
        }
      })
    );
    return newTeamFeatures.filter(Boolean);
  });

  log(`Migrated team features to CalIdTeamFeatures`);
}

// ===============================
// PHASE 8: WORKFLOW RELATIONS
// ===============================

async function migrateCalIdWorkflowsOnEventTypes() {
  log("Migrating WorkflowsOnEventTypes → CalIdWorkflowsOnEventTypes...");

  const oldWorkflowsOnEventTypes = await oldDb.workflowsOnEventTypes.findMany();

  await processBatch(oldWorkflowsOnEventTypes, async (batch) => {
    const newWorkflowsOnEventTypes = await Promise.all(
      batch.map(async (oldWorkflowOnEventType) => {
        try {
          const calIdWorkflowId = idMappings.calIdWorkflows[oldWorkflowOnEventType.workflowId.toString()];
          const eventTypeId = idMappings.eventTypes[oldWorkflowOnEventType.eventTypeId.toString()];

          if (!calIdWorkflowId) {
            log(
              `Skipping workflow on event type ${oldWorkflowOnEventType.id} - workflow not found in mapping`
            );
            return null;
          }

          if (!eventTypeId) {
            log(
              `Skipping workflow on event type ${oldWorkflowOnEventType.id} - event type not found in mapping`
            );
            return null;
          }

          const newWorkflowOnEventType = await newDb.calIdWorkflowsOnEventTypes.create({
            data: {
              workflowId: calIdWorkflowId,
              eventTypeId: eventTypeId,
            },
          });

          return newWorkflowOnEventType;
        } catch (error) {
          logError(`Failed to migrate workflow on event type ${oldWorkflowOnEventType.id}`, error);
          return null;
        }
      })
    );
    return newWorkflowsOnEventTypes.filter(Boolean);
  });

  log(`Migrated workflows on event types to CalIdWorkflowsOnEventTypes`);
}

async function migrateCalIdWorkflowsOnTeams() {
  log("Migrating WorkflowsOnTeams → CalIdWorkflowsOnTeams...");

  const oldWorkflowsOnTeams = await oldDb.workflowsOnTeams.findMany();

  await processBatch(oldWorkflowsOnTeams, async (batch) => {
    const newWorkflowsOnTeams = await Promise.all(
      batch.map(async (oldWorkflowOnTeam) => {
        try {
          const calIdWorkflowId = idMappings.calIdWorkflows[oldWorkflowOnTeam.workflowId.toString()];
          const calIdTeamId = idMappings.calIdTeams[oldWorkflowOnTeam.teamId.toString()];

          if (!calIdWorkflowId || !calIdTeamId) {
            log(`Skipping workflow on team ${oldWorkflowOnTeam.id} - workflow or team not found in mapping`);
            return null;
          }

          const newWorkflowOnTeam = await newDb.calIdWorkflowsOnTeams.create({
            data: {
              workflowId: calIdWorkflowId,
              calIdTeamId: calIdTeamId,
            },
          });

          return newWorkflowOnTeam;
        } catch (error) {
          logError(`Failed to migrate workflow on team ${oldWorkflowOnTeam.id}`, error);
          return null;
        }
      })
    );
    return newWorkflowsOnTeams.filter(Boolean);
  });

  log(`Migrated workflows on teams to CalIdWorkflowsOnTeams`);
}

async function migrateCalIdWorkflowReminders() {
  log("Migrating WorkflowReminder → CalIdWorkflowReminder...");

  const oldWorkflowReminders = await oldDb.workflowReminder.findMany();

  await processBatch(oldWorkflowReminders, async (batch) => {
    const newWorkflowReminders = await Promise.all(
      batch.map(async (oldReminder) => {
        try {
          const calIdWorkflowStepId = oldReminder.workflowStepId
            ? idMappings.calIdWorkflowSteps[oldReminder.workflowStepId.toString()]
            : null;
          const userId = oldReminder.attendeeId ? null : null; // There's no direct user mapping for attendees in CalIdWorkflowReminder

          const newReminder = await newDb.calIdWorkflowReminder.create({
            data: {
              uuid: oldReminder.uuid,
              bookingUid: oldReminder.bookingUid,
              method: oldReminder.method,
              scheduledDate: oldReminder.scheduledDate,
              referenceId: oldReminder.referenceId,
              scheduled: oldReminder.scheduled,
              workflowStepId: calIdWorkflowStepId,
              cancelled: oldReminder.cancelled,
              seatReferenceId: oldReminder.seatReferenceId,
              isMandatoryReminder: oldReminder.isMandatoryReminder,
              retryCount: oldReminder.retryCount,
              userId: userId, // This field exists in new schema but not in old
            },
          });

          return newReminder;
        } catch (error) {
          logError(`Failed to migrate workflow reminder ${oldReminder.id}`, error);
          return null;
        }
      })
    );
    return newWorkflowReminders.filter(Boolean);
  });

  log(`Migrated workflow reminders to CalIdWorkflowReminders`);
}

async function migrateCalIdWorkflowInsights() {
  log("Migrating WorkflowInsights → CalIdWorkflowInsights...");

  const oldWorkflowInsights = await oldDb.workflowInsights.findMany();

  await processBatch(oldWorkflowInsights, async (batch) => {
    const newWorkflowInsights = await Promise.all(
      batch.map(async (oldInsight) => {
        try {
          const calIdWorkflowId = oldInsight.workflowId
            ? idMappings.calIdWorkflows[oldInsight.workflowId.toString()]
            : null;
          const eventTypeId = oldInsight.eventTypeId
            ? idMappings.eventTypes[oldInsight.eventTypeId.toString()]
            : null;

          const newInsight = await newDb.calIdWorkflowInsights.create({
            data: {
              msgId: oldInsight.msgId,
              eventTypeId: eventTypeId || oldInsight.eventTypeId, // Use mapped ID if available, otherwise original
              workflowId: calIdWorkflowId,
              type: oldInsight.type,
              status: oldInsight.status,
              metadata: oldInsight.metadata,
              createdAt: oldInsight.createdAt,
            },
          });

          return newInsight;
        } catch (error) {
          logError(`Failed to migrate workflow insight ${oldInsight.msgId}`, error);
          return null;
        }
      })
    );
    return newWorkflowInsights.filter(Boolean);
  });

  log(`Migrated workflow insights to CalIdWorkflowInsights`);
}

// ===============================
// PHASE 9: REMAINING ENTITIES
// ===============================

async function migrateSelectedCalendars() {
  log("Migrating SelectedCalendars...");

  const oldSelectedCalendars = await oldDb.selectedCalendar.findMany();

  await processBatch(oldSelectedCalendars, async (batch) => {
    const newSelectedCalendars = await Promise.all(
      batch.map(async (oldSelectedCalendar) => {
        try {
          const userId = idMappings.users[oldSelectedCalendar.userId.toString()];
          const credentialId = oldSelectedCalendar.credentialId
            ? idMappings.credentials[oldSelectedCalendar.credentialId.toString()]
            : null;
          const eventTypeId = oldSelectedCalendar.eventTypeId
            ? idMappings.eventTypes[oldSelectedCalendar.eventTypeId.toString()]
            : null;

          if (!userId) {
            log(
              `Skipping selected calendar ${oldSelectedCalendar.userId}-${oldSelectedCalendar.integration} - user not found`
            );
            return null;
          }

          const newSelectedCalendar = await newDb.selectedCalendar.create({
            data: {
              userId: userId,
              integration: oldSelectedCalendar.integration,
              externalId: oldSelectedCalendar.externalId,
              credentialId: credentialId,
              createdAt: oldSelectedCalendar.createdAt,
              updatedAt: oldSelectedCalendar.updatedAt,
              googleChannelId: oldSelectedCalendar.googleChannelId,
              googleChannelKind: oldSelectedCalendar.googleChannelKind,
              googleChannelResourceId: oldSelectedCalendar.googleChannelResourceId,
              googleChannelResourceUri: oldSelectedCalendar.googleChannelResourceUri,
              googleChannelExpiration: oldSelectedCalendar.googleChannelExpiration,
              delegationCredentialId: oldSelectedCalendar.delegationCredentialId,
              domainWideDelegationCredentialId: oldSelectedCalendar.domainWideDelegationCredentialId,
              error: oldSelectedCalendar.error,
              lastErrorAt: oldSelectedCalendar.lastErrorAt,
              watchAttempts: oldSelectedCalendar.watchAttempts,
              unwatchAttempts: oldSelectedCalendar.unwatchAttempts,
              maxAttempts: oldSelectedCalendar.maxAttempts,
              eventTypeId: eventTypeId,
            },
          });

          return newSelectedCalendar;
        } catch (error) {
          logError(
            `Failed to migrate selected calendar ${oldSelectedCalendar.userId}-${oldSelectedCalendar.integration}`,
            error
          );
          return null;
        }
      })
    );
    return newSelectedCalendars.filter(Boolean);
  });

  log(`Migrated ${oldSelectedCalendars.length} selected calendars`);
}

async function migrateWebhooks() {
  log("Migrating Webhooks...");

  const oldWebhooks = await oldDb.webhook.findMany();

  await processBatch(oldWebhooks, async (batch) => {
    const newWebhooks = await Promise.all(
      batch.map(async (oldWebhook) => {
        try {
          const userId = oldWebhook.userId ? idMappings.users[oldWebhook.userId.toString()] : null;
          const calIdTeamId = oldWebhook.teamId ? idMappings.calIdTeams[oldWebhook.teamId.toString()] : null;
          const eventTypeId = oldWebhook.eventTypeId
            ? idMappings.eventTypes[oldWebhook.eventTypeId.toString()]
            : null;

          const newWebhook = await newDb.webhook.create({
            data: {
              id: oldWebhook.id,
              userId: userId,
              calIdTeamId: calIdTeamId, // Use CalIdTeam instead of Team
              eventTypeId: eventTypeId,
              platformOAuthClientId: oldWebhook.platformOAuthClientId,
              subscriberUrl: oldWebhook.subscriberUrl,
              payloadTemplate: oldWebhook.payloadTemplate,
              createdAt: oldWebhook.createdAt,
              active: oldWebhook.active,
              eventTriggers: oldWebhook.eventTriggers,
              appId: oldWebhook.appId,
              secret: oldWebhook.secret,
              platform: oldWebhook.platform,
              time: oldWebhook.time,
              timeUnit: oldWebhook.timeUnit,
            },
          });

          return newWebhook;
        } catch (error) {
          logError(`Failed to migrate webhook ${oldWebhook.id}`, error);
          return null;
        }
      })
    );
    return newWebhooks.filter(Boolean);
  });

  log(`Migrated ${oldWebhooks.length} webhooks`);
}

async function migrateApiKeys() {
  log("Migrating ApiKeys...");

  const oldApiKeys = await oldDb.apiKey.findMany();

  await processBatch(oldApiKeys, async (batch) => {
    const newApiKeys = await Promise.all(
      batch.map(async (oldApiKey) => {
        try {
          const userId = idMappings.users[oldApiKey.userId.toString()];
          const calIdTeamId = oldApiKey.teamId ? idMappings.calIdTeams[oldApiKey.teamId.toString()] : null;

          if (!userId) {
            log(`Skipping API key ${oldApiKey.id} - user not found`);
            return null;
          }

          const newApiKey = await newDb.apiKey.create({
            data: {
              id: oldApiKey.id,
              userId: userId,
              calIdTeamId: calIdTeamId, // Use CalIdTeam instead of Team
              note: oldApiKey.note,
              createdAt: oldApiKey.createdAt,
              expiresAt: oldApiKey.expiresAt,
              lastUsedAt: oldApiKey.lastUsedAt,
              hashedKey: oldApiKey.hashedKey,
              appId: oldApiKey.appId,
            },
          });

          idMappings.apiKeys[oldApiKey.id] = newApiKey.id;
          return newApiKey;
        } catch (error) {
          logError(`Failed to migrate API key ${oldApiKey.id}`, error);
          return null;
        }
      })
    );
    return newApiKeys.filter(Boolean);
  });

  log(`Migrated ${oldApiKeys.length} API keys`);
}

async function migrateAccessCodes() {
  log("Migrating AccessCodes...");

  const oldAccessCodes = await oldDb.accessCode.findMany();

  await processBatch(oldAccessCodes, async (batch) => {
    const newAccessCodes = await Promise.all(
      batch.map(async (oldAccessCode) => {
        try {
          const userId = oldAccessCode.userId ? idMappings.users[oldAccessCode.userId.toString()] : null;
          const calIdTeamId = oldAccessCode.teamId
            ? idMappings.calIdTeams[oldAccessCode.teamId.toString()]
            : null;

          const newAccessCode = await newDb.accessCode.create({
            data: {
              code: oldAccessCode.code,
              clientId: oldAccessCode.clientId,
              expiresAt: oldAccessCode.expiresAt,
              scopes: oldAccessCode.scopes,
              userId: userId,
              calIdTeamId: calIdTeamId, // Use CalIdTeam instead of Team
            },
          });

          return newAccessCode;
        } catch (error) {
          logError(`Failed to migrate access code ${oldAccessCode.id}`, error);
          return null;
        }
      })
    );
    return newAccessCodes.filter(Boolean);
  });

  log(`Migrated ${oldAccessCodes.length} access codes`);
}

async function migrateRoutingForms() {
  log("Migrating Routing Forms...");

  const oldRoutingForms = await oldDb.app_RoutingForms_Form.findMany();

  await processBatch(oldRoutingForms, async (batch) => {
    const newRoutingForms = await Promise.all(
      batch.map(async (oldForm) => {
        try {
          const userId = idMappings.users[oldForm.userId.toString()];
          const calIdTeamId = oldForm.teamId ? idMappings.calIdTeams[oldForm.teamId.toString()] : null;
          const updatedById = oldForm.updatedById ? idMappings.users[oldForm.updatedById.toString()] : null;

          if (!userId) {
            log(`Skipping routing form ${oldForm.id} - user not found`);
            return null;
          }

          const newForm = await newDb.app_RoutingForms_Form.create({
            data: {
              id: oldForm.id,
              description: oldForm.description,
              position: oldForm.position,
              routes: oldForm.routes,
              createdAt: oldForm.createdAt,
              updatedAt: oldForm.updatedAt,
              name: oldForm.name,
              fields: oldForm.fields,
              userId: userId,
              updatedById: updatedById,
              calIdTeamId: calIdTeamId, // Use CalIdTeam instead of Team
              disabled: oldForm.disabled,
              settings: oldForm.settings,
            },
          });

          return newForm;
        } catch (error) {
          logError(`Failed to migrate routing form ${oldForm.id}`, error);
          return null;
        }
      })
    );
    return newRoutingForms.filter(Boolean);
  });

  log(`Migrated ${oldRoutingForms.length} routing forms`);
}

async function migrateAttributes() {
  log("Migrating Attributes...");

  const oldAttributes = await oldDb.attribute.findMany();

  await processBatch(oldAttributes, async (batch) => {
    const newAttributes = await Promise.all(
      batch.map(async (oldAttribute) => {
        try {
          const calIdTeamId = idMappings.calIdTeams[oldAttribute.teamId.toString()];

          if (!calIdTeamId) {
            log(`Skipping attribute ${oldAttribute.id} - team not found`);
            return null;
          }

          const newAttribute = await newDb.attribute.create({
            data: {
              id: oldAttribute.id,
              teamId: oldAttribute.teamId, // Keep original teamId for Team relation
              calIdTeamId: calIdTeamId, // Add CalIdTeam relation
              type: oldAttribute.type,
              name: oldAttribute.name,
              slug: oldAttribute.slug,
              enabled: oldAttribute.enabled,
              usersCanEditRelation: oldAttribute.usersCanEditRelation,
              createdAt: oldAttribute.createdAt,
              updatedAt: oldAttribute.updatedAt,
              isWeightsEnabled: oldAttribute.isWeightsEnabled,
              isLocked: oldAttribute.isLocked,
            },
          });

          idMappings.attributes[oldAttribute.id] = newAttribute.id;
          return newAttribute;
        } catch (error) {
          logError(`Failed to migrate attribute ${oldAttribute.id}`, error);
          return null;
        }
      })
    );
    return newAttributes.filter(Boolean);
  });

  log(`Migrated ${oldAttributes.length} attributes`);
}

async function migrateRoles() {
  log("Migrating Roles...");

  const oldRoles = await oldDb.role.findMany();

  await processBatch(oldRoles, async (batch) => {
    const newRoles = await Promise.all(
      batch.map(async (oldRole) => {
        try {
          const calIdTeamId = oldRole.teamId ? idMappings.calIdTeams[oldRole.teamId.toString()] : null;

          const newRole = await newDb.role.create({
            data: {
              id: oldRole.id,
              name: oldRole.name,
              color: oldRole.color,
              description: oldRole.description,
              teamId: oldRole.teamId, // Keep original teamId for Team relation
              calIdTeamId: calIdTeamId, // Add CalIdTeam relation
              createdAt: oldRole.createdAt,
              updatedAt: oldRole.updatedAt,
              type: oldRole.type,
            },
          });

          idMappings.roles[oldRole.id] = newRole.id;
          return newRole;
        } catch (error) {
          logError(`Failed to migrate role ${oldRole.id}`, error);
          return null;
        }
      })
    );
    return newRoles.filter(Boolean);
  });

  log(`Migrated ${oldRoles.length} roles`);
}

async function migrateVerifiedNumbers() {
  log("Migrating VerifiedNumbers...");

  const oldVerifiedNumbers = await oldDb.verifiedNumber.findMany();

  await processBatch(oldVerifiedNumbers, async (batch) => {
    const newVerifiedNumbers = await Promise.all(
      batch.map(async (oldVerifiedNumber) => {
        try {
          const userId = oldVerifiedNumber.userId
            ? idMappings.users[oldVerifiedNumber.userId.toString()]
            : null;
          const calIdTeamId = oldVerifiedNumber.teamId
            ? idMappings.calIdTeams[oldVerifiedNumber.teamId.toString()]
            : null;

          const newVerifiedNumber = await newDb.verifiedNumber.create({
            data: {
              userId: userId,
              teamId: oldVerifiedNumber.teamId, // Keep original teamId for Team relation
              calIdTeamId: calIdTeamId, // Add CalIdTeam relation
              phoneNumber: oldVerifiedNumber.phoneNumber,
            },
          });

          return newVerifiedNumber;
        } catch (error) {
          logError(`Failed to migrate verified number ${oldVerifiedNumber.id}`, error);
          return null;
        }
      })
    );
    return newVerifiedNumbers.filter(Boolean);
  });

  log(`Migrated ${oldVerifiedNumbers.length} verified numbers`);
}

async function migrateVerifiedEmails() {
  log("Migrating VerifiedEmails...");

  const oldVerifiedEmails = await oldDb.verifiedEmail.findMany();

  await processBatch(oldVerifiedEmails, async (batch) => {
    const newVerifiedEmails = await Promise.all(
      batch.map(async (oldVerifiedEmail) => {
        try {
          const userId = oldVerifiedEmail.userId
            ? idMappings.users[oldVerifiedEmail.userId.toString()]
            : null;
          const calIdTeamId = oldVerifiedEmail.teamId
            ? idMappings.calIdTeams[oldVerifiedEmail.teamId.toString()]
            : null;

          const newVerifiedEmail = await newDb.verifiedEmail.create({
            data: {
              userId: userId,
              teamId: oldVerifiedEmail.teamId, // Keep original teamId for Team relation
              calIdTeamId: calIdTeamId, // Add CalIdTeam relation
              email: oldVerifiedEmail.email,
            },
          });

          return newVerifiedEmail;
        } catch (error) {
          logError(`Failed to migrate verified email ${oldVerifiedEmail.id}`, error);
          return null;
        }
      })
    );
    return newVerifiedEmails.filter(Boolean);
  });

  log(`Migrated ${oldVerifiedEmails.length} verified emails`);
}

async function migrateVerificationTokens() {
  log("Migrating VerificationTokens...");

  const oldVerificationTokens = await oldDb.verificationToken.findMany();

  await processBatch(oldVerificationTokens, async (batch) => {
    const newVerificationTokens = await Promise.all(
      batch.map(async (oldToken) => {
        try {
          const calIdTeamId = oldToken.teamId ? idMappings.calIdTeams[oldToken.teamId.toString()] : null;

          const newToken = await newDb.verificationToken.create({
            data: {
              identifier: oldToken.identifier,
              token: oldToken.token,
              expires: oldToken.expires,
              expiresInDays: oldToken.expiresInDays,
              createdAt: oldToken.createdAt,
              updatedAt: oldToken.updatedAt,
              teamId: oldToken.teamId, // Keep original teamId for Team relation
              calIdTeamId: calIdTeamId, // Add CalIdTeam relation
              secondaryEmailId: oldToken.secondaryEmailId,
            },
          });

          return newToken;
        } catch (error) {
          logError(`Failed to migrate verification token ${oldToken.id}`, error);
          return null;
        }
      })
    );
    return newVerificationTokens.filter(Boolean);
  });

  log(`Migrated ${oldVerificationTokens.length} verification tokens`);
}

async function migrateFilterSegments() {
  log("Migrating FilterSegments...");

  const oldFilterSegments = await oldDb.filterSegment.findMany();

  await processBatch(oldFilterSegments, async (batch) => {
    const newFilterSegments = await Promise.all(
      batch.map(async (oldSegment) => {
        try {
          const userId = idMappings.users[oldSegment.userId.toString()];
          const calIdTeamId = oldSegment.teamId ? idMappings.calIdTeams[oldSegment.teamId.toString()] : null;

          if (!userId) {
            log(`Skipping filter segment ${oldSegment.id} - user not found`);
            return null;
          }

          const newSegment = await newDb.filterSegment.create({
            data: {
              name: oldSegment.name,
              tableIdentifier: oldSegment.tableIdentifier,
              scope: oldSegment.scope === "TEAM" && calIdTeamId ? "CALIDTEAM" : oldSegment.scope, // Map TEAM to CALIDTEAM
              activeFilters: oldSegment.activeFilters,
              sorting: oldSegment.sorting,
              columnVisibility: oldSegment.columnVisibility,
              columnSizing: oldSegment.columnSizing,
              perPage: oldSegment.perPage,
              searchTerm: oldSegment.searchTerm,
              createdAt: oldSegment.createdAt,
              updatedAt: oldSegment.updatedAt,
              userId: userId,
              teamId: oldSegment.teamId, // Keep original teamId for Team relation if needed
              calIdTeamId: calIdTeamId, // Add CalIdTeam relation
            },
          });

          return newSegment;
        } catch (error) {
          logError(`Failed to migrate filter segment ${oldSegment.id}`, error);
          return null;
        }
      })
    );
    return newFilterSegments.filter(Boolean);
  });

  log(`Migrated ${oldFilterSegments.length} filter segments`);
}

// ===============================
// PHASE 10: MISSING MIGRATIONS
// ===============================

async function migrateAttendees() {
  log("Migrating Attendees...");

  const oldAttendees = await oldDb.attendee.findMany();

  await processBatch(oldAttendees, async (batch) => {
    const newAttendees = await Promise.all(
      batch.map(async (oldAttendee) => {
        try {
          const newAttendee = await newDb.attendee.create({
            data: {
              email: oldAttendee.email,
              name: oldAttendee.name,
              timeZone: oldAttendee.timeZone,
              phoneNumber: oldAttendee.phoneNumber,
              locale: oldAttendee.locale,
              bookingId: oldAttendee.bookingId,
              noShow: oldAttendee.noShow,
            },
          });

          return newAttendee;
        } catch (error) {
          logError(`Failed to migrate attendee ${oldAttendee.id}`, error);
          return null;
        }
      })
    );
    return newAttendees.filter(Boolean);
  });

  log(`Migrated ${oldAttendees.length} attendees`);
}

async function migrateBookingReferences() {
  log("Migrating BookingReferences...");

  const oldBookingReferences = await oldDb.bookingReference.findMany();

  await processBatch(oldBookingReferences, async (batch) => {
    const newBookingReferences = await Promise.all(
      batch.map(async (oldReference) => {
        try {
          const credentialId = oldReference.credentialId
            ? idMappings.credentials[oldReference.credentialId.toString()]
            : null;

          const newReference = await newDb.bookingReference.create({
            data: {
              type: oldReference.type,
              uid: oldReference.uid,
              meetingId: oldReference.meetingId,
              thirdPartyRecurringEventId: oldReference.thirdPartyRecurringEventId,
              meetingPassword: oldReference.meetingPassword,
              meetingUrl: oldReference.meetingUrl,
              bookingId: oldReference.bookingId,
              externalCalendarId: oldReference.externalCalendarId,
              deleted: oldReference.deleted,
              credentialId: credentialId,
              delegationCredentialId: oldReference.delegationCredentialId,
              domainWideDelegationCredentialId: oldReference.domainWideDelegationCredentialId,
            },
          });

          return newReference;
        } catch (error) {
          logError(`Failed to migrate booking reference ${oldReference.id}`, error);
          return null;
        }
      })
    );
    return newBookingReferences.filter(Boolean);
  });

  log(`Migrated ${oldBookingReferences.length} booking references`);
}

async function migrateDestinationCalendars() {
  log("Migrating DestinationCalendars...");

  const oldDestinationCalendars = await oldDb.destinationCalendar.findMany();

  await processBatch(oldDestinationCalendars, async (batch) => {
    const newDestinationCalendars = await Promise.all(
      batch.map(async (oldDestCal) => {
        try {
          const userId = oldDestCal.userId ? idMappings.users[oldDestCal.userId.toString()] : null;
          const eventTypeId = oldDestCal.eventTypeId
            ? idMappings.eventTypes[oldDestCal.eventTypeId.toString()]
            : null;
          const credentialId = oldDestCal.credentialId
            ? idMappings.credentials[oldDestCal.credentialId.toString()]
            : null;

          const newDestCal = await newDb.destinationCalendar.create({
            data: {
              integration: oldDestCal.integration,
              externalId: oldDestCal.externalId,
              primaryEmail: oldDestCal.primaryEmail,
              userId: userId,
              eventTypeId: eventTypeId,
              credentialId: credentialId,
              createdAt: oldDestCal.createdAt,
              updatedAt: oldDestCal.updatedAt,
              delegationCredentialId: oldDestCal.delegationCredentialId,
              domainWideDelegationCredentialId: oldDestCal.domainWideDelegationCredentialId,
            },
          });

          return newDestCal;
        } catch (error) {
          logError(`Failed to migrate destination calendar ${oldDestCal.id}`, error);
          return null;
        }
      })
    );
    return newDestinationCalendars.filter(Boolean);
  });

  log(`Migrated ${oldDestinationCalendars.length} destination calendars`);
}

async function migrateHosts() {
  log("Migrating Hosts...");

  const oldHosts = await oldDb.host.findMany();

  await processBatch(oldHosts, async (batch) => {
    const newHosts = await Promise.all(
      batch.map(async (oldHost) => {
        try {
          const userId = idMappings.users[oldHost.userId.toString()];
          const eventTypeId = idMappings.eventTypes[oldHost.eventTypeId.toString()];
          const scheduleId = oldHost.scheduleId ? idMappings.schedules[oldHost.scheduleId.toString()] : null;

          if (!userId || !eventTypeId) {
            log(`Skipping host ${oldHost.userId}-${oldHost.eventTypeId} - user or event type not found`);
            return null;
          }

          const newHost = await newDb.host.create({
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
          logError(`Failed to migrate host ${oldHost.userId}-${oldHost.eventTypeId}`, error);
          return null;
        }
      })
    );
    return newHosts.filter(Boolean);
  });

  log(`Migrated ${oldHosts.length} hosts`);
}

async function migrateEventTypeCustomInputs() {
  log("Migrating EventTypeCustomInputs...");

  const oldCustomInputs = await oldDb.eventTypeCustomInput.findMany();

  await processBatch(oldCustomInputs, async (batch) => {
    const newCustomInputs = await Promise.all(
      batch.map(async (oldInput) => {
        try {
          const eventTypeId = idMappings.eventTypes[oldInput.eventTypeId.toString()];

          if (!eventTypeId) {
            log(`Skipping custom input ${oldInput.id} - event type not found`);
            return null;
          }

          const newInput = await newDb.eventTypeCustomInput.create({
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
          logError(`Failed to migrate custom input ${oldInput.id}`, error);
          return null;
        }
      })
    );
    return newCustomInputs.filter(Boolean);
  });

  log(`Migrated ${oldCustomInputs.length} event type custom inputs`);
}

async function migrateHashedLinks() {
  log("Migrating HashedLinks...");

  const oldHashedLinks = await oldDb.hashedLink.findMany();

  await processBatch(oldHashedLinks, async (batch) => {
    const newHashedLinks = await Promise.all(
      batch.map(async (oldLink) => {
        try {
          const eventTypeId = idMappings.eventTypes[oldLink.eventTypeId.toString()];

          if (!eventTypeId) {
            log(`Skipping hashed link ${oldLink.id} - event type not found`);
            return null;
          }

          const newLink = await newDb.hashedLink.create({
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
          logError(`Failed to migrate hashed link ${oldLink.id}`, error);
          return null;
        }
      })
    );
    return newHashedLinks.filter(Boolean);
  });

  log(`Migrated ${oldHashedLinks.length} hashed links`);
}

// ===============================
// RELATION UPDATE FUNCTIONS
// ===============================

async function updateUserRelations() {
  log("Updating User Relations...");

  // Update users who have movedToProfileId
  const usersWithMovedProfiles = await oldDb.user.findMany({
    where: { movedToProfileId: { not: null } },
  });

  for (const oldUser of usersWithMovedProfiles) {
    const userId = idMappings.users[oldUser.id.toString()];
    const movedToProfileId = oldUser.movedToProfileId
      ? idMappings.profiles[oldUser.movedToProfileId.toString()]
      : null;

    if (userId && movedToProfileId) {
      try {
        await newDb.user.update({
          where: { id: userId },
          data: { movedToProfileId: movedToProfileId },
        });
      } catch (error) {
        logError(`Failed to update user ${userId} movedToProfileId`, error);
      }
    }
  }

  // Update users with organizationId (map to CalIdTeam)
  const usersWithOrgId = await oldDb.user.findMany({
    where: { organizationId: { not: null } },
  });

  for (const oldUser of usersWithOrgId) {
    const userId = idMappings.users[oldUser.id.toString()];
    const organizationId = oldUser.organizationId
      ? idMappings.calIdTeams[oldUser.organizationId.toString()]
      : null;

    if (userId && organizationId) {
      try {
        await newDb.user.update({
          where: { id: userId },
          data: { organizationId: organizationId },
        });
      } catch (error) {
        logError(`Failed to update user ${userId} organizationId`, error);
      }
    }
  }

  log("Updated user relations");
}

async function updateEventTypeParentRelations() {
  log("Updating EventType Parent Relations...");

  const eventTypesWithParent = await oldDb.eventType.findMany({
    where: { parentId: { not: null } },
  });

  for (const oldEventType of eventTypesWithParent) {
    const eventTypeId = idMappings.eventTypes[oldEventType.id.toString()];
    const parentId = oldEventType.parentId ? idMappings.eventTypes[oldEventType.parentId.toString()] : null;

    if (eventTypeId && parentId) {
      try {
        await newDb.eventType.update({
          where: { id: eventTypeId },
          data: { parentId: parentId },
        });
      } catch (error) {
        logError(`Failed to update event type ${eventTypeId} parentId`, error);
      }
    }
  }

  log("Updated event type parent relations");
}

// ===============================
// MAIN MIGRATION ORCHESTRATOR
// ===============================

async function runMigration() {
  try {
    log("Starting comprehensive migration process...");

    // Connect to both databases
    await oldDb.$connect();
    await newDb.$connect();
    log("Connected to both databases");

    // PHASE 1: Core entities (no dependencies)
    log("=== PHASE 1: Core Entities ===");
    await migrateApps();
    await migrateFeatures();
    await migrateUsers();

    // PHASE 2: CalId Teams (replaces Teams)
    log("=== PHASE 2: CalId Teams ===");
    await migrateCalIdTeams();
    await migrateCalIdMemberships();

    // PHASE 3: Schedules and Profiles
    log("=== PHASE 3: Schedules and Profiles ===");
    await migrateSchedules();
    await migrateProfiles();

    // PHASE 4: Credentials and Availabilities
    log("=== PHASE 4: Credentials and Availabilities ===");
    await migrateCredentials();
    await migrateAvailabilities();

    // PHASE 5: Event Types and Bookings
    log("=== PHASE 5: Event Types and Bookings ===");
    await migrateEventTypes();
    await migrateBookings();

    // PHASE 6: CalId Workflows
    log("=== PHASE 6: CalId Workflows ===");
    await migrateCalIdWorkflows();
    await migrateCalIdWorkflowSteps();

    // PHASE 7: Features and Relations
    log("=== PHASE 7: Features and Relations ===");
    await migrateUserFeatures();
    await migrateCalIdTeamFeatures();

    // PHASE 8: Workflow Relations
    log("=== PHASE 8: Workflow Relations ===");
    await migrateCalIdWorkflowsOnEventTypes();
    await migrateCalIdWorkflowsOnTeams();
    await migrateCalIdWorkflowReminders();
    await migrateCalIdWorkflowInsights();

    // PHASE 9: Remaining Entities
    log("=== PHASE 9: Remaining Entities ===");
    await migrateSelectedCalendars();
    await migrateWebhooks();
    await migrateApiKeys();
    await migrateAccessCodes();
    await migrateRoutingForms();
    await migrateAttributes();
    await migrateRoles();
    await migrateVerifiedNumbers();
    await migrateVerifiedEmails();
    await migrateVerificationTokens();
    await migrateFilterSegments();

    // PHASE 10: Missing Migrations
    log("=== PHASE 10: Missing Migrations ===");
    await migrateAttendees();
    await migrateBookingReferences();
    await migrateDestinationCalendars();
    await migrateHosts();
    await migrateEventTypeCustomInputs();
    await migrateHashedLinks();

    // PHASE 11: Update Relations
    log("=== PHASE 11: Update Relations ===");
    await updateUserRelations();
    await updateEventTypeParentRelations();

    log("Migration completed successfully!");

    // Print comprehensive summary
    log("=== MIGRATION SUMMARY ===");
    log(`Users migrated: ${Object.keys(idMappings.users).length}`);
    log(`CalIdTeams migrated: ${Object.keys(idMappings.calIdTeams).length}`);
    log(`CalIdMemberships migrated: ${Object.keys(idMappings.calIdMemberships).length}`);
    log(`Profiles migrated: ${Object.keys(idMappings.profiles).length}`);
    log(`Schedules migrated: ${Object.keys(idMappings.schedules).length}`);
    log(`Credentials migrated: ${Object.keys(idMappings.credentials).length}`);
    log(`EventTypes migrated: ${Object.keys(idMappings.eventTypes).length}`);
    log(`CalIdWorkflows migrated: ${Object.keys(idMappings.calIdWorkflows).length}`);
    log(`CalIdWorkflowSteps migrated: ${Object.keys(idMappings.calIdWorkflowSteps).length}`);
    log(`Attributes migrated: ${Object.keys(idMappings.attributes).length}`);
    log(`Roles migrated: ${Object.keys(idMappings.roles).length}`);
    log(`API Keys migrated: ${Object.keys(idMappings.apiKeys).length}`);

    // Verify record counts
    const newCounts = {
      users: await newDb.user.count(),
      calIdTeams: await newDb.calIdTeam.count(),
      calIdMemberships: await newDb.calIdMembership.count(),
      eventTypes: await newDb.eventType.count(),
      bookings: await newDb.booking.count(),
      calIdWorkflows: await newDb.calIdWorkflow.count(),
      calIdWorkflowSteps: await newDb.calIdWorkflowStep.count(),
    };

    log("=== FINAL COUNTS ===");
    Object.entries(newCounts).forEach(([table, count]) => {
      log(`${table}: ${count} records`);
    });
  } catch (error) {
    logError("Migration failed", error);
    throw error;
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
    log("Disconnected from databases");
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      log("Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logError("Migration script failed", error);
      process.exit(1);
    });
}

export { runMigration, idMappings };
