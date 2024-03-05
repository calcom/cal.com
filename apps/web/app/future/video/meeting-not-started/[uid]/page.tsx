import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import prisma, { bookingMinimalSelect } from "@calcom/prisma";

import MeetingNotStarted from "~/videos/views/videos-meeting-not-started-single-view";
import { getServerSideProps } from "~/videos/views/videos-meeting-not-started-single-view.getServerSideProps";

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

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({ getData, Page: MeetingNotStarted, getLayout: null })<"P">;
