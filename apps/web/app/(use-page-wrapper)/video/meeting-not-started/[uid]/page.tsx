import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/video/meeting-not-started/[uid]/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/videos/views/videos-meeting-not-started-single-view";
import MeetingNotStarted from "~/videos/views/videos-meeting-not-started-single-view";

const querySchema = z.object({
  uid: z.string(),
});

export const generateMetadata = async ({ params }: ServerPageProps) => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    notFound();
  }
  const bookingRepo = new BookingRepository(prisma);
  const booking = await bookingRepo.findBookingByUid({
    bookingUid: parsed.data.uid,
  });

  return await _generateMetadata(
    (t) => t("this_meeting_has_not_started_yet"),
    () => booking?.title ?? "",
    undefined,
    undefined,
    `/video/meeting-not-started/${parsed.data.uid}`
  );
};

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  const props = await getData(context);
  return <MeetingNotStarted {...props} />;
};

export default ServerPage;
