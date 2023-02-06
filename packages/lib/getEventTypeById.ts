import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

import { StripeData } from "@calcom/app-store/stripepayment/lib/server";
import { getEventTypeAppData, getLocationGroupedOptions } from "@calcom/app-store/utils";
import { LocationObject } from "@calcom/core/location";
import { parseBookingLimit, parseRecurringEvent } from "@calcom/lib";
import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { CAL_URL } from "@calcom/lib/constants";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import { getTranslation } from "@calcom/lib/server/i18n";
import { customInputSchema, eventTypeBookingFields, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import slugify from "./slugify";

type Fields = z.infer<typeof eventTypeBookingFields>;

const BookingFieldType = eventTypeBookingFields.element.shape.type.Enum;
const EventTypeCustomInputType = {
  TEXT: "TEXT",
  TEXTLONG: "TEXTLONG",
  NUMBER: "NUMBER",
  BOOL: "BOOL",
  RADIO: "RADIO",
  PHONE: "PHONE",
};

export const ensureBookingInputsHaveSystemFields = ({
  bookingFields,
  disableGuests,
  additionalNotesRequired,
  customInputs,
}: {
  bookingFields: Fields;
  disableGuests: boolean;
  additionalNotesRequired: boolean;
  customInputs: z.infer<typeof customInputSchema>[];
}) => {
  // If bookingFields is set already, the migration is done. The very first time for an EventType bookingFields would be empty
  const handleMigration = !bookingFields.length;
  const CustomInputTypeToFieldType = {
    [EventTypeCustomInputType.TEXT]: BookingFieldType.text,
    [EventTypeCustomInputType.TEXTLONG]: BookingFieldType.textarea,
    [EventTypeCustomInputType.NUMBER]: BookingFieldType.number,
    [EventTypeCustomInputType.BOOL]: BookingFieldType.boolean,
    [EventTypeCustomInputType.RADIO]: BookingFieldType.radio,
    [EventTypeCustomInputType.PHONE]: BookingFieldType.phone,
  };

  // These fields should be added before other user fields
  const systemBeforeFields: typeof bookingFields = [
    {
      label: "your_name",
      type: "name",
      name: "name",
      required: true,
      editable: "system",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      label: "email_address",
      type: "email",
      name: "email",
      required: true,
      editable: "system",
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      label: "location",
      type: "radioInput",
      name: "location",
      editable: "system",
      // Even though it should be required it is optional in production with backend choosing CalVideo as the fallback
      required: false,
      // options: Populated on the fly from locations. HACK: It is a special handling
      optionsInputs: {
        attendeeInPerson: {
          type: "address",
          required: true,
          placeholder: "",
        },
        phone: {
          type: "phone",
          required: true,
          placeholder: "",
        },
      },
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
  ];

  // These fields should be added after other user fields
  const systemAfterFields: typeof bookingFields = [
    {
      label: "additional_notes",
      type: "textarea",
      name: "notes",
      editable: "system-but-optional",
      required: additionalNotesRequired,
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      label: "additional_guests",
      type: "multiemail",
      name: "guests",
      editable: "system-but-optional",
      required: false,
      hidden: disableGuests,
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
    {
      //TODO: How to translate in user language?
      label: "reschedule_reason",
      type: "textarea",
      name: "rescheduleReason",
      editable: "system",
      required: false,
      // Being a FormBuilder field, it is not aware what a booking is and what reschedule is.The BookingPage can take care of showing it on reschedule view only
      hidden: false,
      sources: [
        {
          label: "Default",
          id: "default",
          type: "default",
        },
      ],
    },
  ];

  const missingSystemBeforeFields = [];
  for (const field of systemBeforeFields) {
    // Only do a push, we must not update existing system fields as user could have modified any property in it,
    if (!bookingFields.find((f) => f.name === field.name)) {
      missingSystemBeforeFields.push(field);
    }
  }

  bookingFields = missingSystemBeforeFields.concat(bookingFields);

  // If we are migrating from old system, we need to add custom inputs to the end of the list
  if (handleMigration) {
    customInputs.forEach((input) => {
      console.log(input.label);
      bookingFields.push({
        label: input.label,
        // Custom Input's slugified label was being used as query param for prefilling. So, make that the name of the field
        name: slugify(input.label),
        placeholder: input.placeholder,
        type: CustomInputTypeToFieldType[input.type],
        required: input.required,
        options: input.options
          ? input.options.reduce((newOptions, o) => {
              newOptions.push({
                ...o,
                value: `${newOptions.length + 1}`,
              });
              return newOptions;
            }, [] as NonNullable<Fields[number]["options"]>)
          : [],
      });
    });
  }

  const missingSystemAfterFields = [];
  for (const field of systemAfterFields) {
    // Only do a push, we must not update existing system fields as user could have modified any property in it,
    if (!bookingFields.find((f) => f.name === field.name)) {
      missingSystemAfterFields.push(field);
    }
  }

  bookingFields = bookingFields.concat(missingSystemAfterFields);

  return eventTypeBookingFields.brand<"HAS_SYSTEM_FIELDS">().parse(bookingFields);
};

interface getEventTypeByIdProps {
  eventTypeId: number;
  userId: number;
  prisma: PrismaClient<
    Prisma.PrismaClientOptions,
    never,
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
  isTrpcCall?: boolean;
}

export default async function getEventTypeById({
  eventTypeId,
  userId,
  prisma,
  isTrpcCall = false,
}: getEventTypeByIdProps) {
  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    name: true,
    username: true,
    id: true,
    avatar: true,
    email: true,
    locale: true,
    defaultScheduleId: true,
  });

  const rawEventType = await prisma.eventType.findFirst({
    where: {
      AND: [
        {
          OR: [
            {
              users: {
                some: {
                  id: userId,
                },
              },
            },
            {
              team: {
                members: {
                  some: {
                    userId: userId,
                  },
                },
              },
            },
            {
              userId: userId,
            },
          ],
        },
        {
          id: eventTypeId,
        },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      hidden: true,
      locations: true,
      eventName: true,
      customInputs: true,
      timeZone: true,
      periodType: true,
      metadata: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      recurringEvent: true,
      hideCalendarNotes: true,
      disableGuests: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      slotInterval: true,
      hashedLink: true,
      bookingLimits: true,
      successRedirectUrl: true,
      currency: true,
      bookingFields: true,
      team: {
        select: {
          id: true,
          slug: true,
          members: {
            where: {
              accepted: true,
            },
            select: {
              role: true,
              user: {
                select: userSelect,
              },
            },
          },
        },
      },
      users: {
        select: userSelect,
      },
      schedulingType: true,
      schedule: {
        select: {
          id: true,
        },
      },
      hosts: {
        select: {
          isFixed: true,
          userId: true,
        },
      },
      userId: true,
      price: true,
      destinationCalendar: true,
      seatsPerTimeSlot: true,
      seatsShowAttendees: true,
      webhooks: {
        select: {
          id: true,
          subscriberUrl: true,
          payloadTemplate: true,
          active: true,
          eventTriggers: true,
          secret: true,
          eventTypeId: true,
        },
      },
      workflows: {
        include: {
          workflow: {
            include: {
              activeOn: {
                select: {
                  eventType: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
              steps: true,
            },
          },
        },
      },
    },
  });

  if (!rawEventType) {
    if (isTrpcCall) {
      throw new TRPCError({ code: "NOT_FOUND" });
    } else {
      throw new Error("Event type not found");
    }
  }

  const credentials = await prisma.credential.findMany({
    where: {
      userId,
      app: {
        enabled: true,
      },
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      appId: true,
      invalid: true,
    },
  });

  const { locations, metadata, ...restEventType } = rawEventType;
  const newMetadata = EventTypeMetaDataSchema.parse(metadata || {})!;
  const apps = newMetadata.apps || {};
  const eventTypeWithParsedMetadata = { ...rawEventType, metadata: newMetadata };
  newMetadata.apps = {
    ...apps,
    stripe: {
      ...getStripeAppData(eventTypeWithParsedMetadata, true),
      currency:
        (
          credentials.find((integration) => integration.type === "stripe_payment")
            ?.key as unknown as StripeData
        )?.default_currency || "usd",
    },
    giphy: getEventTypeAppData(eventTypeWithParsedMetadata, "giphy", true),
    rainbow: getEventTypeAppData(eventTypeWithParsedMetadata, "rainbow", true),
  };

  // TODO: How to extract metadata schema from _EventTypeModel to be able to parse it?
  // const parsedMetaData = _EventTypeModel.parse(newMetadata);
  const parsedMetaData = newMetadata;

  const parsedCustomInputs = (rawEventType.customInputs || []).map((input) => customInputSchema.parse(input));

  const eventType = {
    ...restEventType,
    schedule: rawEventType.schedule?.id || rawEventType.users[0]?.defaultScheduleId || null,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    bookingLimits: parseBookingLimit(restEventType.bookingLimits),
    locations: locations as unknown as LocationObject[],
    metadata: parsedMetaData,
    customInputs: parsedCustomInputs,
  };

  // backwards compat
  if (eventType.users.length === 0 && !eventType.team) {
    const fallbackUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: userSelect,
    });
    if (!fallbackUser) {
      if (isTrpcCall) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The event type doesn't have user and no fallback user was found",
        });
      } else {
        throw Error("The event type doesn't have user and no fallback user was found");
      }
    }
    eventType.users.push(fallbackUser);
  }
  const currentUser = eventType.users.find((u) => u.id === userId);
  const t = await getTranslation(currentUser?.locale ?? "en", "common");
  const integrations = await getEnabledApps(credentials);
  const locationOptions = getLocationGroupedOptions(integrations, t);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    bookingFields: ensureBookingInputsHaveSystemFields({
      bookingFields: eventTypeBookingFields.parse(eventType.bookingFields || []),
      disableGuests: eventType.disableGuests,
      additionalNotesRequired: !!parsedMetaData.additionalNotesRequired,
      customInputs: parsedCustomInputs,
    }),
  });

  const teamMembers = eventTypeObject.team
    ? eventTypeObject.team.members.map((member) => {
        const user = member.user;
        user.avatar = `${CAL_URL}/${user.username}/avatar.png`;
        return user;
      })
    : [];

  // Find the current users memebership so we can check role to enable/disable deletion.
  // Sets to null if no membership is found - this must mean we are in a none team event type
  const currentUserMembership = eventTypeObject.team?.members.find((el) => el.user.id === userId) ?? null;

  const finalObj = {
    eventType: eventTypeObject,
    locationOptions,
    team: eventTypeObject.team || null,
    teamMembers,
    currentUserMembership,
  };
  return finalObj;
}
