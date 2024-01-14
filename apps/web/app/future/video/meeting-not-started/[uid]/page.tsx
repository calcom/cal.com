import OldPage from "@pages/video/meeting-not-started/[uid]";
import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { redirect } from "next/navigation";

import prisma, { bookingMinimalSelect } from "@calcom/prisma";

type PageProps = Readonly<{
  params: Params;
}>;

export const generateMetadata = async ({ params }: PageProps) => {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: typeof params?.uid === "string" ? params.uid : "",
    },
    select: bookingMinimalSelect,
  });

  return await _generateMetadata(
    (t) => t("this_meeting_has_not_started_yet"),
    () => booking?.title ?? ""
  );
};

async function getData(context: Omit<GetServerSidePropsContext, "res" | "resolvedUrl">) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: typeof context?.params?.uid === "string" ? context.params.uid : "",
    },
    select: bookingMinimalSelect,
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

export default WithLayout({ getData, Page: OldPage, getLayout: null })<"P">;
