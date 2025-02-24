import MarkdownIt from "markdown-it";
import type { GetServerSidePropsContext } from "next";

import {
  generateGuestMeetingTokenFromOwnerMeetingToken,
  setEnableRecordingUIAndUserIdForOrganizer,
  updateMeetingTokenIfExpired,
} from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getCalVideoReference } from "@calcom/features/get-cal-video-reference";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";

import { ssrInit } from "@server/lib/ssr";

const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;

  const ssr = await ssrInit(context);

  const booking = await BookingRepository.findBookingForMeetingPage({
    bookingUid: context.query.uid as string,
  });

  if (!booking || booking.references.length === 0 || !booking.references[0].meetingUrl) {
    return {
      redirect: {
        destination: "/video/no-meeting-found",
        permanent: false,
      },
    };
  }

  const hasTeamPlan = booking.user?.id
    ? await prisma.membership.findFirst({
        where: {
          userId: booking.user.id,
          team: {
            slug: {
              not: null,
            },
          },
        },
      })
    : false;

  const profile = booking.user
    ? (
        await UserRepository.enrichUserWithItsProfile({
          user: booking.user,
        })
      ).profile
    : null;

  const calVideoLogo = profile?.organization
    ? await OrganizationRepository.findCalVideoLogoByOrgId({ id: profile.organization.id })
    : null;

  //daily.co calls have a 14 days exit buffer when a user enters a call when it's not available it will trigger the modals
  const now = new Date();
  const exitDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  //find out if the meeting is in the past
  const isPast = booking?.endTime <= exitDate;
  if (isPast) {
    return {
      redirect: {
        destination: `/video/meeting-ended/${booking?.uid}`,
        permanent: false,
      },
    };
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  const session = await getServerSession({ req });

  const oldVideoReference = getCalVideoReference(bookingObj.references);

  const endTime = new Date(booking.endTime);
  const fourteenDaysAfter = new Date(endTime.getTime() + 14 * 24 * 60 * 60 * 1000);
  const epochTimeFourteenDaysAfter = Math.floor(fourteenDaysAfter.getTime() / 1000);

  const videoReferencePassword = await updateMeetingTokenIfExpired({
    bookingReferenceId: oldVideoReference.id,
    roomName: oldVideoReference.uid,
    meetingToken: oldVideoReference.meetingPassword,
    exp: epochTimeFourteenDaysAfter,
  });

  // set meetingPassword for guests
  if (session?.user.id !== bookingObj.user?.id) {
    const guestMeetingPassword = await generateGuestMeetingTokenFromOwnerMeetingToken(
      videoReferencePassword,
      session?.user.id
    );

    bookingObj.references.forEach((bookRef) => {
      bookRef.meetingPassword = guestMeetingPassword;
    });
  }
  // Only for backward compatibility and setting user id in participants for organizer
  else {
    const meetingPassword = await setEnableRecordingUIAndUserIdForOrganizer(
      oldVideoReference.id,
      videoReferencePassword,
      session?.user.id
    );
    if (!!meetingPassword) {
      bookingObj.references.forEach((bookRef) => {
        bookRef.meetingPassword = meetingPassword;
      });
    }
  }

  const videoReference = getCalVideoReference(bookingObj.references);

  return {
    props: {
      meetingUrl: videoReference.meetingUrl ?? "",
      ...(typeof videoReference.meetingPassword === "string" && {
        meetingPassword: videoReference.meetingPassword,
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
      hasTeamPlan: !!hasTeamPlan,
      calVideoLogo,
      trpcState: ssr.dehydrate(),
    },
  };
}
