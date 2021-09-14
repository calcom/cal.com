import prisma from "@lib/prisma";
import { EventType } from "@prisma/client";
import "react-phone-number-input/style.css";
import BookingPage from "@components/booking/pages/BookingPage";
import { InferGetServerSidePropsType } from "next";

export default function TeamBookingPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <BookingPage {...props} />;
}

export async function getServerSideProps(context) {
  const eventTypeId = parseInt(context.query.type);
  if (typeof eventTypeId !== "number" || eventTypeId % 1 !== 0) {
    return {
      notFound: true,
    } as const;
  }

  const eventType: EventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      locations: true,
      customInputs: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      team: {
        select: {
          slug: true,
          name: true,
          logo: true,
        },
      },
      users: {
        select: {
          avatar: true,
          name: true,
        },
      },
    },
  });

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  let booking = null;

  if (context.query.rescheduleUid) {
    booking = await prisma.booking.findFirst({
      where: {
        uid: context.query.rescheduleUid,
      },
      select: {
        description: true,
        attendees: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  }

  return {
    props: {
      profile: {
        ...eventTypeObject.team,
        slug: "team/" + eventTypeObject.slug,
        image: eventTypeObject.team.logo,
      },
      eventType: eventTypeObject,
      booking,
    },
  };
}
