import { PrismockClient } from "prismock";
import { beforeEach, vi } from "vitest";

import logger from "@calcom/lib/logger";
import * as selects from "@calcom/prisma/selects";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
  readonlyPrisma: prisma,
  ...selects,
}));

const handlePrismockBugs = () => {
  const __findManyWebhook = prismock.webhook.findMany;
  const __findFirstCEP = prismock.calendarEventParticipant.findFirst;
  const __findManyCEP = prismock.calendarEventParticipant.findMany;
  const __updateManyCEP = prismock.calendarEventParticipant.updateMany;
  const __deleteManyCEP = prismock.calendarEventParticipant.deleteMany;
  const __createCEP = prismock.calendarEventParticipant.create;
  const __createManyCEP = prismock.calendarEventParticipant.createMany;
  const __findUniqueEvent = prismock.calendarEvent.findUnique;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.webhook.findMany = (...rest: any[]) => {
    // There is some bug in prismock where it can't handle complex where clauses
    if (rest[0].where?.OR && rest[0].where.AND) {
      rest[0].where = undefined;
      logger.silly("Fixed Prismock bug-2");
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return __findManyWebhook(...rest);
  };

  // Prismock may return the first inserted participant on findFirst; for update flows we want the latest
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.calendarEventParticipant.findFirst = async (...rest: any[]) => {
    const args = rest[0] || {};
    // If a specific relation field is queried, prefer the most recently created matching row
    if (args?.where?.creatorOfId || args?.where?.organizerOfId || args?.where?.attendeeOfId) {
      const rows = await prismock.calendarEventParticipant.findMany({ where: args.where });
      if (!rows || rows.length === 0) return null as any;
      return rows[rows.length - 1] as any;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return __findFirstCEP(...rest);
  };

  // Ensure where filter works reliably for common participant filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.calendarEventParticipant.findMany = async (...rest: any[]) => {
    const args = rest[0] || {};
    const where = args.where || {};
    // get all rows first
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const all = await __findManyCEP.call(prismock.calendarEventParticipant, {} as any);
    const filtered = all.filter((row: any) => {
      if (where.creatorOfId !== undefined && row.creatorOfId !== where.creatorOfId) return false;
      if (where.organizerOfId !== undefined && row.organizerOfId !== where.organizerOfId) return false;
      if (where.attendeeOfId !== undefined && row.attendeeOfId !== where.attendeeOfId) return false;
      if (where.email !== undefined && row.email !== where.email) return false;
      return true;
    });
    return filtered as any;
  };

  // Work around updateMany not reflecting changes properly for participants
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.calendarEventParticipant.updateMany = async (...rest: any[]) => {
    const args = rest[0] || {};
    if (!args || !args.where) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return __updateManyCEP(...rest);
    }
    const rows = await prismock.calendarEventParticipant.findMany({ where: args.where });
    let count = 0;
    for (const row of rows) {
      await prismock.calendarEventParticipant.update({ where: { id: row.id }, data: args.data || {} });
      count += 1;
    }
    return { count } as any;
  };

  // Ensure deleteMany reliably removes all matching rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.calendarEventParticipant.deleteMany = async (...rest: any[]) => {
    const args = rest[0] || {};
    if (!args || !args.where) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return __deleteManyCEP(...rest);
    }
    const rows = await prismock.calendarEventParticipant.findMany({ where: args.where });
    let count = 0;
    for (const row of rows) {
      await prismock.calendarEventParticipant.delete({ where: { id: row.id } });
      count += 1;
    }
    return { count } as any;
  };

  // Ensure uniqueness per event for creatorOfId and organizerOfId like real DB constraints
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.calendarEventParticipant.create = async (...rest: any[]) => {
    const args = rest[0] || {};
    const data = args?.data || {};
    if (data.creatorOfId) {
      await prismock.calendarEventParticipant.deleteMany({ where: { creatorOfId: data.creatorOfId } });
    }
    if (data.organizerOfId) {
      await prismock.calendarEventParticipant.deleteMany({ where: { organizerOfId: data.organizerOfId } });
    }
    if (data.attendeeOfId && data.email) {
      await prismock.calendarEventParticipant.deleteMany({
        where: { attendeeOfId: data.attendeeOfId, email: data.email },
      });
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return __createCEP(...rest);
  };

  // Enforce unique (attendeeOfId, email) and simulate skipDuplicates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.calendarEventParticipant.createMany = async (...rest: any[]) => {
    const args = rest[0] || {};
    const data = Array.isArray(args?.data) ? args.data : [];
    let count = 0;
    for (const row of data) {
      if (row.attendeeOfId && row.email) {
        await prismock.calendarEventParticipant.deleteMany({
          where: { attendeeOfId: row.attendeeOfId, email: row.email },
        });
      }
      await prismock.calendarEventParticipant.create({ data: row });
      count += 1;
    }
    return { count } as any;
  };

  // Hydrate include relations on calendarEvent.findUnique
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismock.calendarEvent.findUnique = async (...rest: any[]) => {
    const args = rest[0] || {};
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const base = await __findUniqueEvent(...rest);
    if (!base) return base;
    if (!args?.include) return base;
    const eventId = base.id;
    const result: any = { ...base };
    if (args.include.creator) {
      const creators = await prismock.calendarEventParticipant.findMany({ where: { creatorOfId: eventId } });
      result.creator = creators.length > 0 ? creators[creators.length - 1] : null;
    }
    if (args.include.organizer) {
      const organizers = await prismock.calendarEventParticipant.findMany({
        where: { organizerOfId: eventId },
      });
      result.organizer = organizers.length > 0 ? organizers[organizers.length - 1] : null;
    }
    if (args.include.attendees) {
      result.attendees = await prismock.calendarEventParticipant.findMany({
        where: { attendeeOfId: eventId },
      });
    }
    return result;
  };
};

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismock.reset();
  handlePrismockBugs();
});

const prismock = new PrismockClient();

const prisma = prismock;
export default prisma;
