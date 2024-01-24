import OldPage from "@pages/video/[uid]";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import MarkdownIt from "markdown-it";
import type { GetServerSidePropsContext } from "next";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

import { ssrInit } from "@server/lib/ssr";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => `${APP_NAME} Video`,
    (t) => t("quick_video_meeting")
  );

const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });

async function getData(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);

  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid as string,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      description: true,
      isRecorded: true,
      user: {
        select: {
          id: true,
          username: true,
          timeZone: true,
          name: true,
          email: true,
        },
      },
      references: {
        select: {
          uid: true,
          type: true,
          meetingUrl: true,
          meetingPassword: true,
        },
        where: {
          type: "daily_video",
        },
      },
    },
  });

  if (!booking || booking.references.length === 0 || !booking.references[0].meetingUrl) {
    return redirect("/video/no-meeting-found");
  }

  const profile = booking.user
    ? (
        await UserRepository.enrichUserWithItsProfile({
          user: booking.user,
        })
      ).profile
    : null;

  //daily.co calls have a 60 minute exit buffer when a user enters a call when it's not available it will trigger the modals
  const now = new Date();
  const exitDate = new Date(now.getTime() - 60 * 60 * 1000);

  //find out if the meeting is in the past
  const isPast = booking?.endTime <= exitDate;
  if (isPast) {
    return redirect(`/video/meeting-ended/${booking?.uid}`);
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  const session = await getServerSession({ req: context.req });

  // set meetingPassword to null for guests
  if (session?.user.id !== bookingObj.user?.id) {
    bookingObj.references.forEach((bookRef) => {
      bookRef.meetingPassword = null;
    });
  }

  return {
    meetingUrl: bookingObj.references[0].meetingUrl ?? "",
    ...(typeof bookingObj.references[0].meetingPassword === "string" && {
      meetingPassword: bookingObj.references[0].meetingPassword,
    }),
    booking: {
      ...bookingObj,
      ...(bookingObj.description && { description: md.render(bookingObj.description) }),
      user: bookingObj.user
        ? {
            ...bookingObj.user,
            organization: profile?.organization,
          }
        : bookingObj.user,
    },
    dehydratedState: ssr.dehydrate(),
  };
}

export default WithLayout({ getData, Page: OldPage, getLayout: null })<"P">;
