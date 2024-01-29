import type { GetServerSidePropsContext } from "next";

import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

// change the type
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid as string,
    },
    select: bookingMinimalSelect,
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

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  return {
    props: {
      booking: bookingObj,
    },
  };
}
