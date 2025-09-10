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

// ID mapping storage
interface IdMapping {
  [oldId: string]: number;
}

const idMappings = {
  calIdTeams: {} as IdMapping,
  calIdMemberships: {} as IdMapping,
  calIdWorkflows: {} as IdMapping,
  calIdWorkflowSteps: {} as IdMapping,
  calIdTeamFeatures: {} as IdMapping,
  calIdUsers: {} as IdMapping,
  profiles: {} as IdMapping,
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
  batchSize = 100
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

// Migration functions for CalId entities

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
              timeZone: oldTeam.timeZone || "Asia/Kolkata",
              weekStart: oldTeam.weekStart || "Monday",
              bookingFrequency: oldTeam.bookingLimits, // Map bookingLimits to bookingFrequency
              createdAt: oldTeam.createdAt,
              updatedAt: new Date(),
            },
          });

          // Store mapping
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

  log(`Migrated ${oldTeams.length} teams`);
}

async function migrateCalIdMemberships() {
  log("Migrating Membership → CalIdMembership...");

  const oldMemberships = await oldDb.membership.findMany();

  await processBatch(oldMemberships, async (batch) => {
    const newMemberships = await Promise.all(
      batch.map(async (oldMembership) => {
        try {
          const calIdTeamId = idMappings.calIdTeams[oldMembership.teamId.toString()];
          if (!calIdTeamId) {
            log(`Skipping membership ${oldMembership.id} - team not found in mapping`);
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
              userId: oldMembership.userId,
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

  log(`Migrated memberships`);
}

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
          const calIdTeamId = oldWorkflow.teamId
            ? idMappings.calIdTeams[oldWorkflow.teamId.toString()]
            : null;

          const newWorkflow = await newDb.calIdWorkflow.create({
            data: {
              position: oldWorkflow.position,
              name: oldWorkflow.name,
              userId: oldWorkflow.userId,
              calIdTeamId,
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

  log(`Migrated ${oldWorkflows.length} workflows`);
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
              verifiedAt: oldStep.verifiedAt, // New field that might exist in old schema
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

  log(`Migrated workflow steps`);
}

async function migrateUserFeatures() {
  log("Migrating UserFeatures ...");
  const oldUserFeatures = await oldDb.userFeatures.findMany();
  await processBatch(oldUserFeatures, async (batch) => {
    const newUserFeatures = await Promise.all(
      batch.map(async (oldUserFeature) => {
        try {
          const calIdUserId = idMappings.calIdUsers[oldUserFeature.userId.toString()];
          if (!calIdUserId) {
            log(`Skipping user feature ${oldUserFeature.featureId} - user not found in mapping`);
            return null;
          }

          const newUserFeature = await newDb.userFeatures.create({
            data: {
              userId: calIdUserId,
              featureId: oldUserFeature.featureId,
              assignedAt: oldUserFeature.assignedAt,
              assignedBy: oldUserFeature.assignedBy,
              updatedAt: oldUserFeature.updatedAt,
            },
          });

          return newUserFeature;
        } catch (error) {
          logError(`Failed to migrate user feature ${oldUserFeature.id}`, error);
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
              calIdTeamId,
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

  log(`Migrated team features`);
}

async function migrateCalIdWorkflowsOnEventTypes() {
  log("Migrating WorkflowsOnEventTypes → CalIdWorkflowsOnEventTypes...");

  const oldWorkflowsOnEventTypes = await oldDb.workflowsOnEventTypes.findMany();

  await processBatch(oldWorkflowsOnEventTypes, async (batch) => {
    const newWorkflowsOnEventTypes = await Promise.all(
      batch.map(async (oldWorkflowOnEventType) => {
        try {
          const calIdWorkflowId = idMappings.calIdWorkflows[oldWorkflowOnEventType.workflowId.toString()];
          if (!calIdWorkflowId) {
            log(
              `Skipping workflow on event type ${oldWorkflowOnEventType.id} - workflow not found in mapping`
            );
            return null;
          }

          const newWorkflowOnEventType = await newDb.calIdWorkflowsOnEventTypes.create({
            data: {
              workflowId: calIdWorkflowId,
              eventTypeId: oldWorkflowOnEventType.eventTypeId,
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

  log(`Migrated workflows on event types`);
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
              calIdTeamId,
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

  log(`Migrated workflows on teams`);
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
              userId: null, // New field, set to null for migrated data
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

  log(`Migrated workflow reminders`);
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

          const newInsight = await newDb.calIdWorkflowInsights.create({
            data: {
              msgId: oldInsight.msgId,
              eventTypeId: oldInsight.eventTypeId,
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

  log(`Migrated workflow insights`);
}

async function migrateUsers() {
  log("Migrating Users...");

  const oldUsers = await oldDb.user.findMany({
    include: {
      password: true,
      travelSchedules: true,
      // Add other relations as needed
    },
  });

  await processBatch(oldUsers, async (batch) => {
    const newUsers = await Promise.all(
      batch.map(async (oldUser) => {
        try {
          // First create the user
          const newUser = await newDb.user.create({
            data: {
              username: oldUser.username,
              name: oldUser.name,
              email: oldUser.email,
              emailVerified: oldUser.emailVerified,
              bio: oldUser.bio,
              avatarUrl: oldUser.avatarUrl,
              timeZone: oldUser.timeZone,
              weekStart: oldUser.weekStart,
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
              whitelistWorkflows: oldUser.whitelistWorkflows,
            },
          });

          // Create password if exists
          if (oldUser.password) {
            await newDb.userPassword.create({
              data: {
                userId: newUser.id,
                hash: oldUser.password.hash,
              },
            });
          }
          idMappings.calIdUsers[oldUser.id.toString()] = newUser.id;

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

async function migrateProfiles() {
  log("Migrating Profiles...");

  const oldProfiles = await oldDb.profile.findMany();

  await processBatch(oldProfiles, async (batch) => {
    const newProfiles = await Promise.all(
      batch.map(async (oldProfile) => {
        try {
          const userId = idMappings.calIdUsers[oldProfile.userId.toString()];
          const orgId = idMappings.calIdTeams[oldProfile.organizationId.toString()];
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

async function migrateSchedules() {
  log("Migrating Schedules...");

  const oldSchedules = await oldDb.schedule.findMany();

  await processBatch(oldSchedules, async (batch) => {
    const newSchedules = await Promise.all(
      batch.map(async (oldSchedule) => {
        try {
          const userId = idMappings.calIdUsers[oldSchedule.userId.toString()];
          const newSchedule = await newDb.schedule.create({
            data: {
              id: oldSchedule.id,
              userId: userId,
              name: oldSchedule.name,
              timeZone: oldSchedule.timeZone,
            },
          });

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

async function migrateAvailabilities() {
  log("Migrating Availabilities...");

  const oldAvailabilities = await oldDb.availability.findMany();

  await processBatch(oldAvailabilities, async (batch) => {
    const newAvailabilities = await Promise.all(
      batch.map(async (oldAvailability) => {
        try {
          const newAvailability = await newDb.availability.create({
            data: {
              id: oldAvailability.id,
              userId: oldAvailability.userId,
              eventTypeId: oldAvailability.eventTypeId,
              days: oldAvailability.days,
              startTime: oldAvailability.startTime,
              endTime: oldAvailability.endTime,
              date: oldAvailability.date,
              scheduleId: oldAvailability.scheduleId,
            },
          });

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

async function migrateEventTypes() {
  log("Migrating EventTypes...");

  const oldEventTypes = await oldDb.eventType.findMany();

  await processBatch(oldEventTypes, async (batch) => {
    const newEventTypes = await Promise.all(
      batch.map(async (oldEventType) => {
        try {
          const newEventType = await newDb.eventType.create({
            data: {
              id: oldEventType.id,
              title: oldEventType.title,
              slug: oldEventType.slug,
              description: oldEventType.description,
              interfaceLanguage: oldEventType.interfaceLanguage,
              position: oldEventType.position,
              locations: oldEventType.locations,
              length: oldEventType.length,
              offsetStart: oldEventType.offsetStart,
              hidden: oldEventType.hidden,
              userId: oldEventType.userId,
              profileId: oldEventType.profileId,
              teamId: oldEventType.teamId,
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
              canSendCalVideoTranscriptionEmails: oldEventType.canSendCalVideoTranscriptionEmails,
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
              scheduleId: oldEventType.scheduleId,
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
              instantMeetingScheduleId: oldEventType.instantMeetingScheduleId,
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
              restrictionScheduleId: oldEventType.restrictionScheduleId,
              parentId: oldEventType.parentId,
            },
          });

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

async function migrateCredentials() {
  log("Migrating Credentials...");

  const oldCredentials = await oldDb.credential.findMany();

  await processBatch(oldCredentials, async (batch) => {
    const newCredentials = await Promise.all(
      batch.map(async (oldCredential) => {
        try {
          const newCredential = await newDb.credential.create({
            data: {
              id: oldCredential.id,
              type: oldCredential.type,
              key: oldCredential.key,
              userId: oldCredential.userId ? idMappings.calIdUsers[oldCredential.userId.toString()] : null,
              calIdTeamId: oldCredential.teamId
                ? idMappings.calIdTeams[oldCredential.teamId.toString()]
                : null,
              appId: oldCredential.appId,
              subscriptionId: oldCredential.subscriptionId,
              paymentStatus: oldCredential.paymentStatus,
              billingCycleStart: oldCredential.billingCycleStart,
              invalid: oldCredential.invalid,
              delegationCredentialId: oldCredential.delegationCredentialId,
            },
          });

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

async function migrateSelectedCalendars() {
  log("Migrating SelectedCalendars...");

  const oldSelectedCalendars = await oldDb.selectedCalendar.findMany();

  await processBatch(oldSelectedCalendars, async (batch) => {
    const newSelectedCalendars = await Promise.all(
      batch.map(async (oldSelectedCalendar) => {
        try {
          const newSelectedCalendar = await newDb.selectedCalendar.create({
            data: {
              id: oldSelectedCalendar.id,
              userId: oldSelectedCalendar.userId,
              integration: oldSelectedCalendar.integration,
              externalId: oldSelectedCalendar.externalId,
              credentialId: oldSelectedCalendar.credentialId,
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
              eventTypeId: oldSelectedCalendar.eventTypeId,
            },
          });

          return newSelectedCalendar;
        } catch (error) {
          logError(`Failed to migrate selected calendar ${oldSelectedCalendar.id}`, error);
          return null;
        }
      })
    );

    return newSelectedCalendars.filter(Boolean);
  });

  log(`Migrated ${oldSelectedCalendars.length} selected calendars`);
}

async function migrateBookings() {
  log("Migrating Bookings...");

  const oldBookings = await oldDb.booking.findMany();

  await processBatch(oldBookings, async (batch) => {
    const newBookings = await Promise.all(
      batch.map(async (oldBooking) => {
        try {
          const newBooking = await newDb.booking.create({
            data: {
              id: oldBooking.id,
              uid: oldBooking.uid,
              idempotencyKey: oldBooking.idempotencyKey,
              userId: oldBooking.userId,
              userPrimaryEmail: oldBooking.userPrimaryEmail,
              eventTypeId: oldBooking.eventTypeId,
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
              reassignById: oldBooking.reassignById,
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

async function migrateWebhooks() {
  log("Migrating Webhooks...");

  const oldWebhooks = await oldDb.webhook.findMany();

  await processBatch(oldWebhooks, async (batch) => {
    const newWebhooks = await Promise.all(
      batch.map(async (oldWebhook) => {
        try {
          const newWebhook = await newDb.webhook.create({
            data: {
              id: oldWebhook.id,
              userId: oldWebhook.userId,
              teamId: oldWebhook.teamId,
              eventTypeId: oldWebhook.eventTypeId,
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
          const newApiKey = await newDb.apiKey.create({
            data: {
              id: oldApiKey.id,
              userId: oldApiKey.userId,
              teamId: oldApiKey.teamId,
              note: oldApiKey.note,
              createdAt: oldApiKey.createdAt,
              expiresAt: oldApiKey.expiresAt,
              lastUsedAt: oldApiKey.lastUsedAt,
              hashedKey: oldApiKey.hashedKey,
              appId: oldApiKey.appId,
            },
          });

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
          const newAccessCode = await newDb.accessCode.create({
            data: {
              id: oldAccessCode.id,
              code: oldAccessCode.code,
              clientId: oldAccessCode.clientId,
              expiresAt: oldAccessCode.expiresAt,
              scopes: oldAccessCode.scopes,
              userId: oldAccessCode.userId,
              teamId: oldAccessCode.teamId,
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
              userId: oldForm.userId,
              updatedById: oldForm.updatedById,
              teamId: oldForm.teamId,
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
          const newAttribute = await newDb.attribute.create({
            data: {
              id: oldAttribute.id,
              teamId: oldAttribute.teamId,
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
          const newRole = await newDb.role.create({
            data: {
              id: oldRole.id,
              name: oldRole.name,
              color: oldRole.color,
              description: oldRole.description,
              teamId: oldRole.teamId,
              createdAt: oldRole.createdAt,
              updatedAt: oldRole.updatedAt,
              type: oldRole.type,
            },
          });

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
          const newVerifiedNumber = await newDb.verifiedNumber.create({
            data: {
              id: oldVerifiedNumber.id,
              userId: oldVerifiedNumber.userId,
              teamId: oldVerifiedNumber.teamId,
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
          const newVerifiedEmail = await newDb.verifiedEmail.create({
            data: {
              id: oldVerifiedEmail.id,
              userId: oldVerifiedEmail.userId,
              teamId: oldVerifiedEmail.teamId,
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
          const newToken = await newDb.verificationToken.create({
            data: {
              identifier: oldToken.identifier,
              token: oldToken.token,
              expires: oldToken.expires,
              expiresInDays: oldToken.expiresInDays,
              createdAt: oldToken.createdAt,
              updatedAt: oldToken.updatedAt,
              teamId: oldToken.teamId,
              secondaryEmailId: oldToken.secondaryEmailId,
              // calIdTeamId will be set later in updateVerificationTokenRelations if teamId exists
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
          const newSegment = await newDb.filterSegment.create({
            data: {
              name: oldSegment.name,
              tableIdentifier: oldSegment.tableIdentifier,
              scope: oldSegment.scope,
              activeFilters: oldSegment.activeFilters,
              sorting: oldSegment.sorting,
              columnVisibility: oldSegment.columnVisibility,
              columnSizing: oldSegment.columnSizing,
              perPage: oldSegment.perPage,
              searchTerm: oldSegment.searchTerm,
              createdAt: oldSegment.createdAt,
              updatedAt: oldSegment.updatedAt,
              userId: oldSegment.userId,
              teamId: oldSegment.teamId,
              // calIdTeamId will be set later in updateFilterSegmentRelations if teamId exists
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

// Migration functions for updating relations in other models

async function updateEventTypeRelations() {
  log("Updating EventType relations to point to CalIdTeam...");

  const eventTypes = await newDb.eventType.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(eventTypes, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (eventType) => {
        try {
          if (eventType.teamId) {
            const calIdTeamId = idMappings.calIdTeams[eventType.teamId.toString()];
            if (calIdTeamId) {
              await newDb.eventType.update({
                where: { id: eventType.id },
                data: {
                  calIdTeamId,
                  // Keep original teamId for now or set to null based on requirements
                },
              });
            }
          }
          return eventType;
        } catch (error) {
          logError(`Failed to update event type ${eventType.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated EventType relations`);
}

async function updateCredentialRelations() {
  log("Updating Credential relations to point to CalIdTeam...");

  const credentials = await newDb.credential.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(credentials, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (credential) => {
        try {
          if (credential.teamId) {
            const calIdTeamId = idMappings.calIdTeams[credential.teamId.toString()];
            if (calIdTeamId) {
              await newDb.credential.update({
                where: { id: credential.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return credential;
        } catch (error) {
          logError(`Failed to update credential ${credential.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated Credential relations`);
}

async function updateVerificationTokenRelations() {
  log("Updating VerificationToken relations to point to CalIdTeam...");

  const tokens = await newDb.verificationToken.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(tokens, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (token) => {
        try {
          if (token.teamId) {
            const calIdTeamId = idMappings.calIdTeams[token.teamId.toString()];
            if (calIdTeamId) {
              await newDb.verificationToken.update({
                where: { id: token.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return token;
        } catch (error) {
          logError(`Failed to update verification token ${token.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated VerificationToken relations`);
}

async function updateWebhookRelations() {
  log("Updating Webhook relations to point to CalIdTeam...");

  const webhooks = await newDb.webhook.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(webhooks, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (webhook) => {
        try {
          if (webhook.teamId) {
            const calIdTeamId = idMappings.calIdTeams[webhook.teamId.toString()];
            if (calIdTeamId) {
              await newDb.webhook.update({
                where: { id: webhook.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return webhook;
        } catch (error) {
          logError(`Failed to update webhook ${webhook.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated Webhook relations`);
}

async function updateApiKeyRelations() {
  log("Updating ApiKey relations to point to CalIdTeam...");

  const apiKeys = await newDb.apiKey.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(apiKeys, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (apiKey) => {
        try {
          if (apiKey.teamId) {
            const calIdTeamId = idMappings.calIdTeams[apiKey.teamId.toString()];
            if (calIdTeamId) {
              await newDb.apiKey.update({
                where: { id: apiKey.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return apiKey;
        } catch (error) {
          logError(`Failed to update api key ${apiKey.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated ApiKey relations`);
}

async function updateAccessCodeRelations() {
  log("Updating AccessCode relations to point to CalIdTeam...");

  const accessCodes = await newDb.accessCode.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(accessCodes, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (accessCode) => {
        try {
          if (accessCode.teamId) {
            const calIdTeamId = idMappings.calIdTeams[accessCode.teamId.toString()];
            if (calIdTeamId) {
              await newDb.accessCode.update({
                where: { id: accessCode.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return accessCode;
        } catch (error) {
          logError(`Failed to update access code ${accessCode.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated AccessCode relations`);
}

async function updateRoutingFormRelations() {
  log("Updating App_RoutingForms_Form relations to point to CalIdTeam...");

  const routingForms = await newDb.app_RoutingForms_Form.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(routingForms, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (form) => {
        try {
          if (form.teamId) {
            const calIdTeamId = idMappings.calIdTeams[form.teamId.toString()];
            if (calIdTeamId) {
              await newDb.app_RoutingForms_Form.update({
                where: { id: form.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return form;
        } catch (error) {
          logError(`Failed to update routing form ${form.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated App_RoutingForms_Form relations`);
}

async function updateAttributeRelations() {
  log("Updating Attribute relations to point to CalIdTeam...");

  const attributes = await newDb.attribute.findMany();

  await processBatch(attributes, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (attribute) => {
        try {
          const calIdTeamId = idMappings.calIdTeams[attribute.teamId.toString()];
          if (calIdTeamId) {
            await newDb.attribute.update({
              where: { id: attribute.id },
              data: {
                calIdTeamId,
              },
            });
          }
          return attribute;
        } catch (error) {
          logError(`Failed to update attribute ${attribute.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated Attribute relations`);
}

async function updateRoleRelations() {
  log("Updating Role relations to point to CalIdTeam...");

  const roles = await newDb.role.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(roles, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (role) => {
        try {
          if (role.teamId) {
            const calIdTeamId = idMappings.calIdTeams[role.teamId.toString()];
            if (calIdTeamId) {
              await newDb.role.update({
                where: { id: role.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return role;
        } catch (error) {
          logError(`Failed to update role ${role.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated Role relations`);
}

async function updateFilterSegmentRelations() {
  log("Updating FilterSegment relations to point to CalIdTeam...");

  const filterSegments = await newDb.filterSegment.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(filterSegments, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (segment) => {
        try {
          if (segment.teamId) {
            const calIdTeamId = idMappings.calIdTeams[segment.teamId.toString()];
            if (calIdTeamId) {
              await newDb.filterSegment.update({
                where: { id: segment.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return segment;
        } catch (error) {
          logError(`Failed to update filter segment ${segment.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated FilterSegment relations`);
}

async function updateVerifiedNumberRelations() {
  log("Updating VerifiedNumber relations to point to CalIdTeam...");

  const verifiedNumbers = await newDb.verifiedNumber.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(verifiedNumbers, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (verifiedNumber) => {
        try {
          if (verifiedNumber.teamId) {
            const calIdTeamId = idMappings.calIdTeams[verifiedNumber.teamId.toString()];
            if (calIdTeamId) {
              await newDb.verifiedNumber.update({
                where: { id: verifiedNumber.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return verifiedNumber;
        } catch (error) {
          logError(`Failed to update verified number ${verifiedNumber.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated VerifiedNumber relations`);
}

async function updateVerifiedEmailRelations() {
  log("Updating VerifiedEmail relations to point to CalIdTeam...");

  const verifiedEmails = await newDb.verifiedEmail.findMany({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  await processBatch(verifiedEmails, async (batch) => {
    const updates = await Promise.all(
      batch.map(async (verifiedEmail) => {
        try {
          if (verifiedEmail.teamId) {
            const calIdTeamId = idMappings.calIdTeams[verifiedEmail.teamId.toString()];
            if (calIdTeamId) {
              await newDb.verifiedEmail.update({
                where: { id: verifiedEmail.id },
                data: {
                  calIdTeamId,
                },
              });
            }
          }
          return verifiedEmail;
        } catch (error) {
          logError(`Failed to update verified email ${verifiedEmail.id}`, error);
          return null;
        }
      })
    );

    return updates.filter(Boolean);
  });

  log(`Updated VerifiedEmail relations`);
}

// Main migration function
async function runMigration() {
  try {
    log("Starting migration process...");

    // First, connect to both databases
    await oldDb.$connect();
    await newDb.$connect();
    log("Connected to both databases");

    await migrateUsers();
    await migrateCalIdTeams();
    await migrateCalIdMemberships();
    await migrateApps();
    await migrateCredentials();
    await migrateFeatures();
    await migrateUserFeatures();
    await migrateCalIdTeamFeatures();
    await migrateProfiles();
    await migrateSchedules();

    await migrateAvailabilities();
    await migrateEventTypes();
    await migrateSelectedCalendars();
    await migrateBookings();
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

    // Step 2: Migrate CalId entities (these reference the original data)
    await migrateCalIdWorkflows();
    await migrateCalIdWorkflowSteps();
    await migrateCalIdWorkflowsOnEventTypes();
    await migrateCalIdWorkflowsOnTeams();
    await migrateCalIdWorkflowReminders();
    await migrateCalIdWorkflowInsights();

    log("Migration completed successfully!");

    // Print summary
    log("Migration Summary:");
    log(`Users migrated: ${await newDb.user.count()}`);
    log(`Teams migrated: ${await newDb.team.count()}`);
    log(`EventTypes migrated: ${await newDb.eventType.count()}`);
    log(`Bookings migrated: ${await newDb.booking.count()}`);
    log(`CalIdTeams migrated: ${Object.keys(idMappings.calIdTeams).length}`);
    log(`CalIdMemberships migrated: ${Object.keys(idMappings.calIdMemberships).length}`);
    log(`CalIdWorkflows migrated: ${Object.keys(idMappings.calIdWorkflows).length}`);
    log(`CalIdWorkflowSteps migrated: ${Object.keys(idMappings.calIdWorkflowSteps).length}`);
    log(`CalIdTeamFeatures migrated: ${Object.keys(idMappings.calIdTeamFeatures).length}`);
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
