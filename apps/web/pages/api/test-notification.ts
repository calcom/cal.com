import { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { sendTestNotification } from "@calcom/emails";
import { defaultHandler, defaultResponder, getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";

const bodySchema = z.object({
  workflowStepId: z.number(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { workflowStepId } = bodySchema.parse(req.body);
  const session = await getSession({ req });

  if (!session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  }

  const workflowStepToTest = await prisma.workflowStep.findUnique({
    where: {
      id: workflowStepId,
    },
  });

  if (!workflowStepToTest) {
    throw new HttpError({ statusCode: 401, message: "Workflow step not found" });
  }

  const user = await prisma.user.findUnique({
    rejectOnNotFound: true,
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      timeZone: true,
      locale: true,
    },
  });
  const t = await getTranslation(user.locale ?? "en", "common");

  const attendee: Person = {
    name: user.name || "",
    email: user.email || "",
    timeZone: user.timeZone,
    language: { translate: t, locale: user.locale ?? "en" },
  };

  const evt: CalendarEvent = {
    type: "booking type",
    title: "booking title",
    description: "description" || undefined,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    customInputs: null,
    organizer: {
      email: "dezerb@gmail.com",
      name: user.name || "",
      timeZone: user.timeZone,
      language: { translate: t, locale: user.locale ?? "en" },
    },
    attendees: [attendee],
    uid: "uid",
    destinationCalendar: null,
    recurringEvent: null,
  };

  await sendTestNotification(evt, workflowStepToTest, user.locale ?? "en");

  res.status(204).end();
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
