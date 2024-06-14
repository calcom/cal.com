import { prisma } from "@calcom/prisma";
import type { Prisma, EventType, User, Team } from "@calcom/prisma/client";

export async function substituteEventTypeDelete(deletedEventType: EventType) {
  const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
    where: { target: { path: ["targetEvent"], equals: deletedEventType.id } },
  });

  toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
    const updatedTarget = toBeUpdatedAuditLog.target as Prisma.JsonObject;
    if ("targetEvent" in updatedTarget) {
      updatedTarget.targetEvent = deletedEventType.title;
      await prisma.auditLog.update({
        where: { id: toBeUpdatedAuditLog.id },
        data: { target: updatedTarget },
      });
    }
  });
}

export async function substituteEventTypeDeleteMany(deletedEventTypes: EventType[]) {
  const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
    where: {
      target: {
        path: ["targetEvent"],
        equals: { in: deletedEventTypes.map((e: EventType) => e.id) },
      },
    },
  });

  toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
    const updatedTarget = toBeUpdatedAuditLog.target as Prisma.JsonObject;
    if ("targetEvent" in updatedTarget) {
      updatedTarget.targetEvent = deletedEventTypes.find(
        (e: EventType) => e.id === updatedTarget.targetEvent
      )?.title;
      await prisma.auditLog.update({
        where: { id: toBeUpdatedAuditLog.id },
        data: { target: updatedTarget },
      });
    }
  });
}

export async function substituteUserCreate(createdUser: User) {
  const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
    where: { actorUser: { path: ["id"], equals: createdUser.id } },
  });

  toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
    const updatedActorUser = toBeUpdatedAuditLog.actorUser as Prisma.JsonObject;
    if ("id" in updatedActorUser) {
      updatedActorUser.id = createdUser.id;
      delete updatedActorUser.email;
      delete updatedActorUser.name;

      await prisma.auditLog.update({
        where: { id: toBeUpdatedAuditLog.id },
        data: { actorUser: updatedActorUser },
      });
    }
  });
}

export async function substituteUserUpdate(prevUser: User, updatedUser: User) {
  // This function is called when a user updates their email to update targetUserEmails in target Json
  const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
    where: { target: { path: ["targetEmails"], array_contains: prevUser.email } },
  });

  toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
    const updatedTarget = toBeUpdatedAuditLog.target as Prisma.JsonObject;
    if (Array.isArray(updatedTarget.targetEmails) && updatedTarget.targetEmails.includes(prevUser.email)) {
      updatedTarget.targetEmails = updatedTarget.targetEmails.map((email) =>
        email !== prevUser.email ? updatedUser.email : email
      );
      await prisma.auditLog.update({
        where: { id: toBeUpdatedAuditLog.id },
        data: { target: updatedTarget },
      });
    }
  });
}

export async function substituteUserDelete(deletedUser: User) {
  const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
    where: { actorUser: { path: ["id"], equals: deletedUser.id } },
  });

  // This function adds user email and name if actorUser deletes its account for auditlog table
  toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
    const updatedActorUser = toBeUpdatedAuditLog.actorUser as Prisma.JsonObject;
    if ("id" in updatedActorUser) {
      updatedActorUser.email = deletedUser.email;
      updatedActorUser.name = deletedUser.name;

      await prisma.auditLog.update({
        where: { id: toBeUpdatedAuditLog.id },
        data: { actorUser: updatedActorUser },
      });
    }
  });
}

export async function substituteTeamDelete(deletedTeam: Team) {
  const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
    where: { targetTeam: { path: ["id"], equals: deletedTeam.id } },
  });

  toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
    const updatedTargetTeam = toBeUpdatedAuditLog.targetTeam as Prisma.JsonObject;
    if ("id" in updatedTargetTeam) {
      updatedTargetTeam.name = deletedTeam.name;
      updatedTargetTeam.slug = deletedTeam.slug;

      await prisma.auditLog.update({
        where: { id: toBeUpdatedAuditLog.id },
        data: { targetTeam: updatedTargetTeam },
      });
    }
  });
}
