import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { GetServerSidePropsContext } from "next";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const bookingRepo = new BookingRepository(prisma);
  const booking = await bookingRepo.findBookingForMeetingEndedPage({
    bookingUid: context.query.uid as string,
  });

  if (!booking) {
    const redirect = {
      redirect: {
        destination: "/video/no-meeting-found",
        permanent: false,
      },
    } as const;

    return redirect;
  }

  // Booking Object DTO, we should not expose any sensitive data through getServerSideProps + server components
  const bookingObj = Object.assign(
    {},
    {
      title: booking.title,
      startTime: booking.startTime.toString(),
      endTime: booking.endTime.toString(),
    }
  );

  return {
    props: {
      booking: bookingObj,
    },
  };
}
