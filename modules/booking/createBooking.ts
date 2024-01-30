import { Prisma } from "@prisma/client";
import short from "short-uuid";
import z from "zod";
import dayjs from "@calcom/dayjs";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type {
    CalendarEvent,
} from "@calcom/types/Calendar";
import { getBookingData } from "./getBookingData";
import { loadUsers } from "../userLoader/loadUsers";
import { getEventTypesFromDB } from "../eventTypes/getEventTypesFromDB";
import getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import { getOriginalRescheduledBooking } from "./getOriginalRescheduledBooking";
import { getRequiresConfirmationFlags } from "../confirmationFlags/getRequiresConfirmationFlags"

type AwaitedBookingData = Awaited<ReturnType<typeof getBookingData>>;
export type EventTypeId = AwaitedBookingData["eventTypeId"];
export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>>;
export type NewBookingEventType =
    | Awaited<ReturnType<typeof getDefaultEvent>>
    | Awaited<ReturnType<typeof getEventTypesFromDB>>;
export type IsConfirmedByDefault = ReturnType<typeof getRequiresConfirmationFlags>["isConfirmedByDefault"];

// Work with Typescript to require reqBody.end
type ReqBodyWithoutEnd = z.infer<ReturnType<typeof getBookingDataSchema>>;
type ReqBodyWithEnd = ReqBodyWithoutEnd & { end: string };


export async function createBooking({
    originalRescheduledBooking,
    evt,
    eventTypeId,
    eventTypeSlug,
    reqBodyUser,
    reqBodyMetadata,
    reqBodyRecurringEventId,
    uid,
    responses,
    isConfirmedByDefault,
    smsReminderNumber,
    organizerUser,
    rescheduleReason,
    eventType,
    bookerEmail,
    paymentAppData,
    changedOrganizer,
}: {
    originalRescheduledBooking: OriginalRescheduledBooking;
    evt: CalendarEvent;
    eventType: NewBookingEventType;
    eventTypeId: EventTypeId;
    eventTypeSlug: AwaitedBookingData["eventTypeSlug"];
    reqBodyUser: ReqBodyWithEnd["user"];
    reqBodyMetadata: ReqBodyWithEnd["metadata"];
    reqBodyRecurringEventId: ReqBodyWithEnd["recurringEventId"];
    uid: short.SUUID;
    responses: ReqBodyWithEnd["responses"] | null;
    isConfirmedByDefault: IsConfirmedByDefault;
    smsReminderNumber: AwaitedBookingData["smsReminderNumber"];
    organizerUser: Awaited<ReturnType<typeof loadUsers>>[number] & {
        isFixed?: boolean;
        metadata?: Prisma.JsonValue;
    };
    rescheduleReason: Awaited<ReturnType<typeof getBookingData>>["rescheduleReason"];
    bookerEmail: Awaited<ReturnType<typeof getBookingData>>["email"];
    paymentAppData: ReturnType<typeof getPaymentAppData>;
    changedOrganizer: boolean;
}) {
    if (originalRescheduledBooking) {
        evt.title = originalRescheduledBooking?.title || evt.title;
        evt.description = originalRescheduledBooking?.description || evt.description;
        evt.location = originalRescheduledBooking?.location || evt.location;
        evt.location = changedOrganizer ? evt.location : originalRescheduledBooking?.location || evt.location;
    }

    const eventTypeRel = !eventTypeId
        ? {}
        : {
            connect: {
                id: eventTypeId,
            },
        };

    const dynamicEventSlugRef = !eventTypeId ? eventTypeSlug : null;
    const dynamicGroupSlugRef = !eventTypeId ? (reqBodyUser as string).toLowerCase() : null;

    const attendeesData = evt.attendees.map((attendee) => {
        //if attendee is team member, it should fetch their locale not booker's locale
        //perhaps make email fetch request to see if his locale is stored, else
        return {
            name: attendee.name,
            email: attendee.email,
            timeZone: attendee.timeZone,
            locale: attendee.language.locale,
        };
    });

    if (evt.team?.members) {
        attendeesData.push(
            ...evt.team.members.map((member) => ({
                email: member.email,
                name: member.name,
                timeZone: member.timeZone,
                locale: member.language.locale,
            }))
        );
    }

    const newBookingData: Prisma.BookingCreateInput = {
        uid,
        responses: responses === null || evt.seatsPerTimeSlot ? Prisma.JsonNull : responses,
        title: evt.title,
        startTime: dayjs.utc(evt.startTime).toDate(),
        endTime: dayjs.utc(evt.endTime).toDate(),
        description: evt.seatsPerTimeSlot ? null : evt.additionalNotes,
        customInputs: isPrismaObjOrUndefined(evt.customInputs),
        status: isConfirmedByDefault ? BookingStatus.ACCEPTED : BookingStatus.PENDING,
        location: evt.location,
        eventType: eventTypeRel,
        smsReminderNumber,
        metadata: reqBodyMetadata,
        attendees: {
            createMany: {
                data: attendeesData,
            },
        },
        dynamicEventSlugRef,
        dynamicGroupSlugRef,
        iCalUID: evt.iCalUID ?? "",
        user: {
            connect: {
                id: organizerUser.id,
            },
        },
        destinationCalendar:
            evt.destinationCalendar && evt.destinationCalendar.length > 0
                ? {
                    connect: { id: evt.destinationCalendar[0].id },
                }
                : undefined,
    };

    if (reqBodyRecurringEventId) {
        newBookingData.recurringEventId = reqBodyRecurringEventId;
    }
    if (originalRescheduledBooking) {
        newBookingData.metadata = {
            ...(typeof originalRescheduledBooking.metadata === "object" && originalRescheduledBooking.metadata),
        };
        newBookingData["paid"] = originalRescheduledBooking.paid;
        newBookingData["fromReschedule"] = originalRescheduledBooking.uid;
        if (originalRescheduledBooking.uid) {
            newBookingData.cancellationReason = rescheduleReason;
        }
        if (newBookingData.attendees?.createMany?.data) {
            // Reschedule logic with booking with seats
            if (eventType?.seatsPerTimeSlot && bookerEmail) {
                newBookingData.attendees.createMany.data = attendeesData.filter(
                    (attendee) => attendee.email === bookerEmail
                );
            }
        }
        if (originalRescheduledBooking.recurringEventId) {
            newBookingData.recurringEventId = originalRescheduledBooking.recurringEventId;
        }
    }
    const createBookingObj = {
        include: {
            user: {
                select: { email: true, name: true, timeZone: true, username: true },
            },
            attendees: true,
            payment: true,
            references: true,
        },
        data: newBookingData,
    };

    if (originalRescheduledBooking?.paid && originalRescheduledBooking?.payment) {
        const bookingPayment = originalRescheduledBooking?.payment?.find((payment) => payment.success);

        if (bookingPayment) {
            createBookingObj.data.payment = {
                connect: { id: bookingPayment.id },
            };
        }
    }

    if (typeof paymentAppData.price === "number" && paymentAppData.price > 0) {
        /* Validate if there is any payment app credential for this user */
        await prisma.credential.findFirstOrThrow({
            where: {
                appId: paymentAppData.appId,
                ...(paymentAppData.credentialId ? { id: paymentAppData.credentialId } : { userId: organizerUser.id }),
            },
            select: {
                id: true,
            },
        });
    }

    return prisma.booking.create(createBookingObj);
}