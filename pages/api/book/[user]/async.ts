import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { EventType, User } from "@prisma/client";
import { CalendarEvent } from "@lib/calendarClient";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";
import EventAttendeeMail from "../../../../lib/emails/EventAttendeeMail";
import logger from "../../../../lib/logger";
import { /*EventManager,*/ EventResult } from "@lib/events/EventManager";
import { Exception } from "handlebars";

const translator = short();

const log = logger.getChildLogger({ prefix: ["[api] book:user:async"] });

export async function handleLegacyConfirmationMail(
  results: Array<EventResult>,
  eventType: EventType,
  evt: CalendarEvent,
  hashUID: string
): Promise<{ error: Exception; message: string | null }> {
  if (results.length === 0 && !eventType.requiresConfirmation) {
    // Legacy as well, as soon as we have a separate email integration class. Just used
    // to send an email even if there is no integration at all.
    try {
      const mail = new EventAttendeeMail(evt, hashUID);
      await mail.sendEmail();
    } catch (e) {
      return { error: e, message: "Booking failed" };
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { user } = req.query;
  log.debug(`Booking ${user} started`);

  try {
    const currentUser: User = await prisma.user.findFirst({
      where: {
        username: user,
      },
      select: {
        id: true,
        credentials: true,
        timeZone: true,
        email: true,
        name: true,
      },
    });

    // Initialize EventManager with credentials
    // const eventManager = new EventManager(currentUser.credentials);

    const invitee = [{ email: req.body.email, name: req.body.name, timeZone: req.body.timeZone }];
    const guests = req.body.guests.map((guest) => {
      const g = {
        email: guest,
        name: "",
        timeZone: req.body.timeZone,
      };
      return g;
    });
    const attendeesList = [...invitee, ...guests];

    const yacCredential = await prisma.credential.findFirst({
      where: {
        type: "yac",
        userId: currentUser.id,
      },
      select: {
        key: true,
      },
    });
    if (!(yacCredential && yacCredential.key && (yacCredential.key as any).api_token)) {
      log.error(`Booking ${user} failed`, "Error when saving booking to db", e);
      res.status(500).json({ message: "Booking already exists" });
      return;
    }
    const yacToken = (yacCredential.key as any).api_token;
    const { id: groupId } = await (
      await fetch({
        method: "POST",
        url: "https://api-v3.yacchat.com/api/v1/group/create",
        headers: {
          Authorization: yacToken,
        },
        body: {
          name: req.body.topic,
          goal: req.body.notes,
        },
      })
    ).json();
    await fetch({
      method: "POST",
      url: `https://api-v3.yacchat.com/api/v2/groups/${groupId}/members`,
      headers: {
        Authorization: yacToken,
      },
      body: {
        emails: attendeesList.map((x) => x.email),
      },
    });
    const { inviteLink } = await (
      await fetch({
        method: "POST",
        url: `https://api-v3.yacchat.com/api/v2/groups/${groupId}/invite-link`,
        headers: {
          Authorization: yacToken,
        },
      })
    ).json();

    const hashUID =
      results.length > 0 ? results[0].uid : translator.fromUUID(uuidv5(JSON.stringify(evt), uuidv5.URL));

    const evt: CalendarEvent = {
      title: req.body.topic,
      description: req.body.notes,
      startTime: req.body.start,
      endTime: req.body.end,
      organizer: { email: currentUser.email, name: currentUser.name, timeZone: currentUser.timeZone },
      attendees: attendeesList,
      location: req.body.location, // Will be processed by the EventManager later.
    };

    try {
      await prisma.booking.create({
        data: {
          uid: hashUID,
          userId: currentUser.id,
          title: evt.title,
          description: evt.description,
          startTime: evt.startTime,
          endTime: evt.endTime,
          attendees: {
            create: evt.attendees,
          },
          confirmed: !eventType.requiresConfirmation,
          location: inviteLink,
        },
      });
    } catch (e) {
      log.error(`Booking ${user} failed`, "Error when saving booking to db", e);
      res.status(500).json({ message: "Booking already exists" });
      return;
    }

    log.debug(`Booking ${user} completed`);
    return res.status(204).json({ message: "Booking completed" });
  } catch (reason) {
    log.error(`Booking ${user} failed`, reason);
    return res.status(500).json({ message: "Booking failed for some unknown reason" });
  }
}
