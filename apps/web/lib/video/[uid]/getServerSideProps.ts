import {
  generateGuestMeetingTokenFromOwnerMeetingToken,
  setEnableRecordingUIAndUserIdForOrganizer,
  updateMeetingTokenIfExpired,
} from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { getCalVideoReference } from "@calcom/features/get-cal-video-reference";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { CAL_VIDEO_MEETING_LINK_FOR_TESTING } from "@calcom/lib/constants";
import { isENVDev } from "@calcom/lib/env";
import prisma from "@calcom/prisma";
import MarkdownIt from "markdown-it";
import type { GetServerSidePropsContext } from "next";

const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });

type CalVideoSettings = {
  disableRecordingForGuests: boolean;
  disableRecordingForOrganizer: boolean;
  enableAutomaticTranscription: boolean;
  enableAutomaticRecordingForOrganizer: boolean;
  disableTranscriptionForGuests: boolean;
  disableTranscriptionForOrganizer: boolean;
  requireEmailForGuests: boolean;
};

const shouldEnableRecordButton = ({
  hasTeamPlan,
  calVideoSettings,
  isOrganizer,
}: {
  hasTeamPlan: boolean;
  calVideoSettings?: CalVideoSettings | null;
  isOrganizer: boolean;
}) => {
  if (!hasTeamPlan) return false;
  if (!calVideoSettings) return true;

  if (isOrganizer) {
    return !calVideoSettings.disableRecordingForOrganizer;
  }

  return !calVideoSettings.disableRecordingForGuests;
};

const shouldEnableAutomaticTranscription = ({
  hasTeamPlan,
  calVideoSettings,
}: {
  hasTeamPlan: boolean;
  calVideoSettings?: CalVideoSettings | null;
}) => {
  if (!hasTeamPlan) return false;
  if (!calVideoSettings) return false;

  return !!calVideoSettings.enableAutomaticTranscription;
};

const shouldEnableAutomaticRecording = ({
  hasTeamPlan,
  calVideoSettings,
  isOrganizer,
}: {
  hasTeamPlan: boolean;
  calVideoSettings?: CalVideoSettings | null;
  isOrganizer: boolean;
}) => {
  if (!hasTeamPlan || !isOrganizer) return false;
  if (!calVideoSettings) return false;

  return !!calVideoSettings.enableAutomaticRecordingForOrganizer;
};

const shouldEnableTranscriptionButton = ({
  hasTeamPlan,
  calVideoSettings,
  isOrganizer,
}: {
  hasTeamPlan: boolean;
  calVideoSettings?: CalVideoSettings | null;
  isOrganizer: boolean;
}) => {
  if (!hasTeamPlan) return false;
  if (!calVideoSettings) return true;

  if (isOrganizer) {
    return !calVideoSettings.disableTranscriptionForOrganizer;
  }

  return !calVideoSettings.disableTranscriptionForGuests;
};

const checkIfUserIsHost = async ({
  booking,
  sessionUserId,
}: {
  booking: {
    user: { id: number } | null;
    eventTypeId: number | undefined;
  };
  sessionUserId?: number;
}) => {
  if (!sessionUserId) return false;

  if (!booking.eventTypeId) {
    return booking.user?.id === sessionUserId;
  }

  const eventTypeRepo = new EventTypeRepository(prisma);
  const eventType = await eventTypeRepo.findByIdWithUserAccess({
    id: booking.eventTypeId,
    userId: sessionUserId,
  });

  // If eventType exists, it means user is either owner, host or user
  return !!eventType;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;

  const bookingRepo = new BookingRepository(prisma);
  const booking = await bookingRepo.findBookingIncludeCalVideoSettingsAndReferences({
    bookingUid: context.query.uid as string,
  });

  // Below if block is for local testing purposes only
  // STARTS------------------------------------------------------------------------------
  if (booking?.references[0] && isENVDev && CAL_VIDEO_MEETING_LINK_FOR_TESTING) {
    // meetingUrl is `null` in dev env, so setting a dummy meetingUrl (it's a past but real meeting link in production env)
    booking.references[0].meetingUrl = CAL_VIDEO_MEETING_LINK_FOR_TESTING;
  }
  // ENDS--------------------------------------------------------------------------------

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

  const userRepo = new UserRepository(prisma);
  const profile = booking.user
    ? (
        await userRepo.enrichUserWithItsProfile({
          user: booking.user,
        })
      ).profile
    : null;

  const organizationRepository = getOrganizationRepository();

  const calVideoLogo = profile?.organization
    ? await organizationRepository.findCalVideoLogoByOrgId({ id: profile.organization.id })
    : null;

  //daily.co calls have a 14 days exit buffer when a user enters a call when it's not available it will trigger the modals
  const now = new Date();
  const exitDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  //find out if the meeting is in the past
  const isPast = booking?.endTime <= exitDate;
  const testingUid =
    CAL_VIDEO_MEETING_LINK_FOR_TESTING && CAL_VIDEO_MEETING_LINK_FOR_TESTING?.split("/").pop();
  const isTestingLink = booking?.uid === testingUid;

  if (isPast && !isTestingLink) {
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

  const sessionUserId = session?.user?.impersonatedBy ? session.user.impersonatedBy.id : session?.user.id;
  const sessionUserEmail = session?.user?.email;
  const isOrganizer = await checkIfUserIsHost({
    booking: {
      eventTypeId: bookingObj.eventType?.id,
      user: bookingObj.user,
    },
    sessionUserId,
  });

  const isAttendee = sessionUserEmail
    ? (bookingObj.attendees?.some(
        (attendee) => attendee.email.toLowerCase() === sessionUserEmail.toLowerCase()
      ) ?? false)
    : false;

  // set meetingPassword for guests
  if (!isOrganizer) {
    const userIdForToken = sessionUserId;

    const guestMeetingPassword = await generateGuestMeetingTokenFromOwnerMeetingToken({
      meetingToken: videoReferencePassword,
      userId: userIdForToken,
    });

    bookingObj.references.forEach((bookRef) => {
      bookRef.meetingPassword = guestMeetingPassword;
    });
  }
  // Only for backward compatibility and setting user id in participants for organizer
  else {
    const meetingPassword = await setEnableRecordingUIAndUserIdForOrganizer(
      oldVideoReference.id,
      videoReferencePassword,
      sessionUserId
    );
    if (meetingPassword) {
      bookingObj.references.forEach((bookRef) => {
        bookRef.meetingPassword = meetingPassword;
      });
    }
  }

  const videoReference = getCalVideoReference(bookingObj.references);

  const showRecordingButton = shouldEnableRecordButton({
    hasTeamPlan: !!hasTeamPlan,
    calVideoSettings: bookingObj.eventType?.calVideoSettings,
    isOrganizer,
  });

  const enableAutomaticTranscription = shouldEnableAutomaticTranscription({
    hasTeamPlan: !!hasTeamPlan,
    calVideoSettings: bookingObj.eventType?.calVideoSettings,
  });

  const enableAutomaticRecordingForOrganizer = shouldEnableAutomaticRecording({
    hasTeamPlan: !!hasTeamPlan,
    calVideoSettings: bookingObj.eventType?.calVideoSettings,
    isOrganizer,
  });

  const showTranscriptionButton = shouldEnableTranscriptionButton({
    hasTeamPlan: !!hasTeamPlan,
    calVideoSettings: bookingObj.eventType?.calVideoSettings,
    isOrganizer,
  });

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
      loggedInUserName: sessionUserId ? session?.user?.name : undefined,
      showRecordingButton,
      enableAutomaticTranscription,
      enableAutomaticRecordingForOrganizer,
      showTranscriptionButton,
      rediectAttendeeToOnExit: isOrganizer
        ? undefined
        : bookingObj.eventType?.calVideoSettings?.redirectUrlOnExit,
      overrideName: Array.isArray(context.query.name) ? context.query.name[0] : context.query.name,
      requireEmailForGuests: bookingObj.eventType?.calVideoSettings?.requireEmailForGuests ?? false,
      isLoggedInUserPartOfMeeting: isAttendee || isOrganizer,
    },
  };
}
