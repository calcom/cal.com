import prisma from "@lib/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import BookingPage from "@components/booking/pages/BookingPage";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Book(props: any): JSX.Element {
  return <BookingPage {...props} />;
}

export async function getServerSideProps(context) {
  const user = await prisma.user.findUnique({
    where: {
      username: context.query.user,
    },
    select: {
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      theme: true,
    },
  });

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: parseInt(context.query.type),
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
      users: {
        select: {
          username: true,
          name: true,
          email: true,
          bio: true,
          avatar: true,
          theme: true,
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
        slug: user.username,
        name: user.name,
        image: user.avatar,
        theme: user.theme,
      },
      eventType: eventTypeObject,
      booking,
    },
  };
}
