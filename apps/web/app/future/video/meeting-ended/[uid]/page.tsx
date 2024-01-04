import OldPage from "@pages/video/meeting-ended/[uid]";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { redirect } from "next/navigation";

import prisma, { bookingMinimalSelect } from "@calcom/prisma";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Meeting Unavailable",
    () => "Meeting Unavailable"
  );

async function getData(context: Omit<GetServerSidePropsContext, "res" | "resolvedUrl">) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: typeof context?.params?.uid === "string" ? context.params.uid : "",
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      user: {
        select: {
          credentials: true,
        },
      },
      references: {
        select: {
          uid: true,
          type: true,
          meetingUrl: true,
        },
      },
    },
  });

  if (!booking) {
    return redirect("/video/no-meeting-found");
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  return {
    booking: bookingObj,
  };
}

// @ts-expect-error getData arg
export default WithLayout({ getData, Page: OldPage, getLayout: null })<"P">;
