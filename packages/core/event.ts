import type { TFunction } from "next-i18next";
import z from "zod";

import { guessEventLocationType } from "@calcom/app-store/locations";
import type { Prisma } from "@calcom/prisma/client";

export const nameObjectSchema = z.object({
  firstName: z.string(),
  lastName: z.string().optional(),
});

function parseName(name: z.infer<typeof nameObjectSchema> | string | undefined) {
  let firstName = "Nameless";
  let lastName = "Nameless";
  let fullName = "Nameless";

  if (typeof name === "string") {
    const trimmedName = name.trim();
    fullName = trimmedName;

    const splitPoint = trimmedName.indexOf(" ");
    if (splitPoint < 0) {
      firstName = trimmedName;
      lastName = "";
    } else {
      firstName = trimmedName.slice(0, splitPoint);
      lastName = name.slice(splitPoint + 1, name.length);
    }
  } else if (typeof name === "object" && nameObjectSchema.parse(name)) {
    fullName = `${name.firstName} ${name.lastName}`.trim();
    firstName = name.firstName;
    lastName = name.lastName ?? "";
  }

  return { firstName, lastName, fullName };
}

export type EventNameObjectType = {
  attendeeName: z.infer<typeof nameObjectSchema> | string;
  eventType: string;
  eventName?: string | null;
  teamName?: string | null;
  host: string;
  location?: string;
  eventDuration: number;
  bookingFields?: Prisma.JsonObject;
  t: TFunction;
};

export function getEventName(eventNameObj: EventNameObjectType, forAttendeeView = false) {
  const {
    firstName: attendeeFirstName,
    lastName: attendeeLastName,
    fullName: attendeeFullName,
  } = parseName(eventNameObj.attendeeName);

  if (!eventNameObj.eventName)
    return eventNameObj.t("event_between_users", {
      eventName: eventNameObj.eventType,
      host: eventNameObj.teamName || eventNameObj.host,
      attendeeName: attendeeFullName,
      interpolation: {
        escapeValue: false,
      },
    });

  let eventName = eventNameObj.eventName;
  let locationString = eventNameObj.location || "";

  if (eventNameObj.eventName.includes("{Location}") || eventNameObj.eventName.includes("{LOCATION}")) {
    const eventLocationType = guessEventLocationType(eventNameObj.location);
    if (eventLocationType) {
      locationString = eventLocationType.label;
    }
    eventName = eventName.replace("{Location}", locationString);
    eventName = eventName.replace("{LOCATION}", locationString);
  }

  let dynamicEventName = eventName
    // Need this for compatibility with older event names
    .replaceAll("{Event type title}", eventNameObj.eventType)
    .replaceAll("{Scheduler}", attendeeFullName)
    .replaceAll("{Organiser}", eventNameObj.host)
    .replaceAll("{Organiser first name}", eventNameObj.host.split(" ")[0])
    .replaceAll("{USER}", attendeeFullName)
    .replaceAll("{ATTENDEE}", attendeeFullName)
    .replaceAll("{HOST}", eventNameObj.host)
    .replaceAll("{HOST/ATTENDEE}", forAttendeeView ? eventNameObj.host : attendeeFullName)
    .replaceAll("{Event duration}", `${String(eventNameObj.eventDuration)} mins`)
    .replaceAll("{name}", attendeeFullName)
    .replaceAll(
      "{Scheduler first name}",
      attendeeFullName === eventNameObj.t("scheduler") ? "{Scheduler first name}" : attendeeFirstName
    )
    .replaceAll(
      "{Scheduler last name}",
      attendeeFullName === eventNameObj.t("scheduler") ? "{Scheduler last name}" : attendeeLastName
    );

  const customInputvariables = dynamicEventName.match(/\{(.+?)}/g)?.map((variable) => {
    return variable.replace("{", "").replace("}", "");
  });

  customInputvariables?.forEach((variable) => {
    if (eventNameObj.bookingFields) {
      Object.keys(eventNameObj.bookingFields).forEach((bookingField) => {
        if (variable === bookingField) {
          let fieldValue;
          if (eventNameObj.bookingFields) {
            const field = eventNameObj.bookingFields[bookingField as keyof typeof eventNameObj.bookingFields];
            if (field && typeof field === "object" && "value" in field) {
              fieldValue = field?.value?.toString();
            } else {
              fieldValue = field?.toString();
            }
          }
          dynamicEventName = dynamicEventName.replace(`{${variable}}`, fieldValue || "");
        }
      });
    }
  });

  return dynamicEventName;
}

export const validateCustomEventName = (value: string, bookingFields?: Prisma.JsonObject) => {
  let customInputVariables: string[] = [];
  if (bookingFields) {
    customInputVariables = Object.keys(bookingFields).map((customInput) => {
      return `{${customInput}}`;
    });
  }

  const validVariables = customInputVariables.concat([
    "{Event type title}",
    "{Organiser}",
    "{Scheduler}",
    "{Location}",
    "{Organiser first name}",
    "{Scheduler first name}",
    "{Scheduler last name}",
    "{Event duration}",
    //allowed for fallback reasons
    "{LOCATION}",
    "{HOST/ATTENDEE}",
    "{HOST}",
    "{ATTENDEE}",
    "{USER}",
  ]);
  const matches = value.match(/\{([^}]+)\}/g);
  if (matches?.length) {
    for (const item of matches) {
      if (!validVariables.includes(item)) {
        return item;
      }
    }
  }

  return true;
};
