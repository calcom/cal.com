import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";

import { DeelTimeOffType, type DeelTimeOffEvent } from "../types";

const DEEL_TIME_OFF_TYPE_TO_REASON: Record<string, string> = {
  [DeelTimeOffType.PTO]: "vacation",
  [DeelTimeOffType.SICK_LEAVE]: "sick",
  [DeelTimeOffType.PUBLIC_HOLIDAY]: "public_holiday",
  [DeelTimeOffType.OTHER]: "unspecified",
};

export async function mapDeelEventToOOOEntry(
  event: DeelTimeOffEvent,
  userId: number
): Promise<{
  uuid: string;
  start: Date;
  end: Date;
  notes: string;
  userId: number;
  reasonId: number | null;
}> {
  const reasonName = DEEL_TIME_OFF_TYPE_TO_REASON[event.type] || "unspecified";

  const reason = await prisma.outOfOfficeReason.findFirst({
    where: {
      reason: reasonName,
      enabled: true,
      OR: [{ userId: null }, { userId }],
    },
    orderBy: {
      userId: "desc",
    },
  });

  const notes = `Deel Time Off (ID: ${event.id})${event.notes ? `\n${event.notes}` : ""}`;

  return {
    uuid: uuidv4(),
    start: new Date(event.start_date),
    end: new Date(event.end_date),
    notes,
    userId,
    reasonId: reason?.id || null,
  };
}

export function extractDeelTimeOffId(notes: string | null): string | null {
  if (!notes) return null;

  const match = notes.match(/Deel Time Off \(ID: ([^)]+)\)/);
  return match ? match[1] : null;
}
