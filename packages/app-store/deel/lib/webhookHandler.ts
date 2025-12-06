import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import type { DeelWebhookPayload } from "../types";
import { mapDeelEventToOOOEntry } from "./oooMapper";

const log = logger.getSubLogger({ prefix: ["[DeelWebhookHandler]"] });

export async function handleTimeOffCreated(payload: DeelWebhookPayload): Promise<void> {
  const { data: event } = payload;

  const credential = await prisma.credential.findFirst({
    where: {
      type: "deel_other_calendar",
      key: {
        path: ["employee_id"],
        equals: event.employee_id,
      },
    },
    select: {
      id: true,
      userId: true,
      key: true,
    },
  });

  if (!credential || !credential.userId) {
    log.warn(`No credential found for Deel employee ${event.employee_id}`);
    return;
  }

  const existingEntry = await prisma.outOfOfficeEntry.findFirst({
    where: {
      userId: credential.userId,
      notes: {
        contains: `Deel Time Off (ID: ${event.id})`,
      },
    },
  });

  if (existingEntry) {
    log.info(`OOO entry already exists for Deel time off ${event.id}`);
    return;
  }

  const oooData = await mapDeelEventToOOOEntry(event, credential.userId);

  await prisma.outOfOfficeEntry.create({
    data: oooData,
  });

  log.info(`Created OOO entry for Deel time off ${event.id}`);
}

export async function handleTimeOffUpdated(payload: DeelWebhookPayload): Promise<void> {
  const { data: event } = payload;

  const credential = await prisma.credential.findFirst({
    where: {
      type: "deel_other_calendar",
      key: {
        path: ["employee_id"],
        equals: event.employee_id,
      },
    },
    select: {
      userId: true,
    },
  });

  if (!credential || !credential.userId) {
    log.warn(`No credential found for Deel employee ${event.employee_id}`);
    return;
  }

  const existingEntry = await prisma.outOfOfficeEntry.findFirst({
    where: {
      userId: credential.userId,
      notes: {
        contains: `Deel Time Off (ID: ${event.id})`,
      },
    },
  });

  if (!existingEntry) {
    log.warn(`No OOO entry found for Deel time off ${event.id}, creating new entry`);
    await handleTimeOffCreated(payload);
    return;
  }

  const oooData = await mapDeelEventToOOOEntry(event, credential.userId);

  await prisma.outOfOfficeEntry.update({
    where: {
      id: existingEntry.id,
    },
    data: {
      start: oooData.start,
      end: oooData.end,
      notes: oooData.notes,
      reasonId: oooData.reasonId,
    },
  });

  log.info(`Updated OOO entry for Deel time off ${event.id}`);
}

export async function handleTimeOffDeleted(payload: DeelWebhookPayload): Promise<void> {
  const { data: event } = payload;

  const credential = await prisma.credential.findFirst({
    where: {
      type: "deel_other_calendar",
      key: {
        path: ["employee_id"],
        equals: event.employee_id,
      },
    },
    select: {
      userId: true,
    },
  });

  if (!credential || !credential.userId) {
    log.warn(`No credential found for Deel employee ${event.employee_id}`);
    return;
  }

  const existingEntry = await prisma.outOfOfficeEntry.findFirst({
    where: {
      userId: credential.userId,
      notes: {
        contains: `Deel Time Off (ID: ${event.id})`,
      },
    },
  });

  if (!existingEntry) {
    log.warn(`No OOO entry found for Deel time off ${event.id}`);
    return;
  }

  await prisma.outOfOfficeEntry.delete({
    where: {
      id: existingEntry.id,
    },
  });

  log.info(`Deleted OOO entry for Deel time off ${event.id}`);
}

export async function processWebhook(payload: DeelWebhookPayload): Promise<void> {
  switch (payload.event) {
    case "time_off.created":
      await handleTimeOffCreated(payload);
      break;
    case "time_off.updated":
      await handleTimeOffUpdated(payload);
      break;
    case "time_off.deleted":
      await handleTimeOffDeleted(payload);
      break;
    default:
      log.warn(`Unknown webhook event: ${payload.event}`);
  }
}
