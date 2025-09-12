import type { MigrationContext } from "../types";

export async function updateUserRelations(ctx: MigrationContext) {
  ctx.log("Updating User Relations...");

  // Update users who have movedToProfileId
  const usersWithMovedProfiles = await ctx.oldDb.user.findMany({
    where: { movedToProfileId: { not: null } },
  });

  for (const oldUser of usersWithMovedProfiles) {
    const userId = ctx.idMappings.users[oldUser.id.toString()];
    const movedToProfileId = oldUser.movedToProfileId
      ? ctx.idMappings.profiles[oldUser.movedToProfileId.toString()]
      : null;

    if (userId && movedToProfileId) {
      try {
        await ctx.newDb.user.update({
          where: { id: userId },
          data: { movedToProfileId: movedToProfileId },
        });
      } catch (error) {
        ctx.logError(`Failed to update user ${userId} movedToProfileId`, error);
      }
    }
  }

  // Update users with organizationId (map to CalIdTeam)
  const usersWithOrgId = await ctx.oldDb.user.findMany({
    where: { organizationId: { not: null } },
  });

  for (const oldUser of usersWithOrgId) {
    const userId = ctx.idMappings.users[oldUser.id.toString()];
    const organizationId = oldUser.organizationId
      ? ctx.idMappings.calIdTeams[oldUser.organizationId.toString()]
      : null;

    if (userId && organizationId) {
      try {
        await ctx.newDb.user.update({
          where: { id: userId },
          data: { organizationId: organizationId },
        });
      } catch (error) {
        ctx.logError(`Failed to update user ${userId} organizationId`, error);
      }
    }
  }

  ctx.log("Updated user relations");
}

export async function updateEventTypeParentRelations(ctx: MigrationContext) {
  ctx.log("Updating EventType Parent Relations...");

  const eventTypesWithParent = await ctx.oldDb.eventType.findMany({
    where: { parentId: { not: null } },
  });

  for (const oldEventType of eventTypesWithParent) {
    const eventTypeId = ctx.idMappings.eventTypes[oldEventType.id.toString()];
    const parentId = oldEventType.parentId
      ? ctx.idMappings.eventTypes[oldEventType.parentId.toString()]
      : null;

    if (eventTypeId && parentId) {
      try {
        await ctx.newDb.eventType.update({
          where: { id: eventTypeId },
          data: { parentId: parentId },
        });
      } catch (error) {
        ctx.logError(`Failed to update event type ${eventTypeId} parentId`, error);
      }
    }
  }

  ctx.log("Updated event type parent relations");
}

export async function updateScheduleRelations(ctx: MigrationContext) {
  ctx.log("Updating Schedule Relations...");

  // Update event types with instantMeetingScheduleId
  const eventTypesWithInstantSchedule = await ctx.oldDb.eventType.findMany({
    where: { instantMeetingScheduleId: { not: null } },
  });

  for (const oldEventType of eventTypesWithInstantSchedule) {
    const eventTypeId = ctx.idMappings.eventTypes[oldEventType.id.toString()];
    const instantMeetingScheduleId = oldEventType.instantMeetingScheduleId
      ? ctx.idMappings.schedules[oldEventType.instantMeetingScheduleId.toString()]
      : null;

    if (eventTypeId && instantMeetingScheduleId) {
      try {
        await ctx.newDb.eventType.update({
          where: { id: eventTypeId },
          data: { instantMeetingScheduleId: instantMeetingScheduleId },
        });
      } catch (error) {
        ctx.logError(`Failed to update event type ${eventTypeId} instantMeetingScheduleId`, error);
      }
    }
  }

  // Update event types with restrictionScheduleId
  const eventTypesWithRestrictionSchedule = await ctx.oldDb.eventType.findMany({
    where: { restrictionScheduleId: { not: null } },
  });

  for (const oldEventType of eventTypesWithRestrictionSchedule) {
    const eventTypeId = ctx.idMappings.eventTypes[oldEventType.id.toString()];
    const restrictionScheduleId = oldEventType.restrictionScheduleId
      ? ctx.idMappings.schedules[oldEventType.restrictionScheduleId.toString()]
      : null;

    if (eventTypeId && restrictionScheduleId) {
      try {
        await ctx.newDb.eventType.update({
          where: { id: eventTypeId },
          data: { restrictionScheduleId: restrictionScheduleId },
        });
      } catch (error) {
        ctx.logError(`Failed to update event type ${eventTypeId} restrictionScheduleId`, error);
      }
    }
  }

  ctx.log("Updated schedule relations");
}

export async function runPhase17(ctx: MigrationContext) {
  ctx.log("=== PHASE 17: Update Relations ===");
  await updateUserRelations(ctx);
  await updateEventTypeParentRelations(ctx);
  await updateScheduleRelations(ctx);
}
