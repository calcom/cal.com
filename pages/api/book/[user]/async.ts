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
      log.error(`Booking ${user} failed`, "Error getting yac credential for user", e);
      res.status(500).json({ message: "Could not get Yac user credentials for " + user });
      return;
    }
    const yacToken = (yacCredential.key as any).api_token;
    const { groupDetails = {} } = await (
      await fetch("https://api-v3.yacchat.com/api/v1/group/create", {
        method: "POST",
        headers: {
          Authorization: yacToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: req.body.topic,
          bio: req.body.notes,
        }),
      })
    ).json();
    const { id: groupId } = groupDetails;

    await fetch(`https://api-v3.yacchat.com/api/v2/groups/${groupId}/members`, {
      method: "POST",
      headers: {
        Authorization: yacToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emails: attendeesList.map((x) => x.email),
        resendInvite: true,
      }),
    });
    const { inviteLink } = await (
      await fetch(`https://api-v3.yacchat.com/api/v2/groups/${groupId}/invite-link`, {
        method: "GET",
        headers: {
          Authorization: yacToken,
          "Content-Type": "application/json",
        },
      })
    ).json();
    const evt: CalendarEvent = {
      title: req.body.topic,
      description: req.body.notes,
      organizer: { email: currentUser.email, name: currentUser.name, timeZone: currentUser.timeZone },
      attendees: attendeesList,
      location: req.body.location, // Will be processed by the EventManager later.
    };
    const hashUID = translator.fromUUID(uuidv5(JSON.stringify(evt), uuidv5.URL));

    try {
      const booking = await prisma.booking.create({
        data: {
          uid: hashUID,
          userId: currentUser.id,
          title: evt.title,
          description: evt.description,
          attendees: {
            create: evt.attendees,
          },
          location: inviteLink,
        },
        select: {
          id: true,
        },
      });
      if (booking && booking.id) {
        log.debug(`Booking ${user} completed`);
        return res.status(200).json({ message: "Booking completed", bookingId: booking.id });
      } else {
        throw new Error("Couldn't get booking id");
      }
    } catch (e) {
      log.error(`Booking ${user} failed`, "Error when saving booking to db", e);
      res.status(500).json({ message: "Booking already exists" });
      return;
    }
  } catch (reason) {
    log.error(`Booking ${user} failed`, reason);
    return res.status(500).json({ message: "Booking failed for some unknown reason" });
  }
}
