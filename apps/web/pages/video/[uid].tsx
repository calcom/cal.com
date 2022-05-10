import DailyIframe from "@daily-co/daily-js";
import { NextPageContext } from "next";
import { getSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

export type JoinCallPageProps = inferSSRProps<typeof getServerSideProps>;

export default function JoinCall(props: JoinCallPageProps) {
  const { t } = useLocale();
  const session = props.session;
  const router = useRouter();

  //if no booking redirectis to the 404 page
  const emptyBooking = props.booking === null;

  //daily.co calls have a 60 minute exit buffer when a user enters a call when it's not available it will trigger the modals
  const now = new Date();
  const exitDate = new Date(now.getTime() - 60 * 60 * 1000);

  //find out if the meeting is in the past
  const isPast = new Date(props.booking?.endTime || "") <= exitDate;
  const meetingUnavailable = isPast == true;

  useEffect(() => {
    if (emptyBooking) {
      router.push("/video/no-meeting-found");
    }

    if (isPast) {
      router.push(`/video/meeting-ended/${props.booking?.uid}`);
    }
  });

  useEffect(() => {
    if (!meetingUnavailable && !emptyBooking && session?.userid !== props.booking.user?.id) {
      const callFrame = DailyIframe.createFrame({
        theme: {
          colors: {
            accent: "#FFF",
            accentText: "#111111",
            background: "#111111",
            backgroundAccent: "#111111",
            baseText: "#FFF",
            border: "#292929",
            mainAreaBg: "#111111",
            mainAreaBgAccent: "#111111",
            mainAreaText: "#FFF",
            supportiveText: "#FFF",
          },
        },
        showLeaveButton: true,
        iframeStyle: {
          position: "fixed",
          width: "100%",
          height: "100%",
        },
      });
      callFrame.join({
        url: props.booking.dailyRef?.dailyurl,
        showLeaveButton: true,
      });
    }
    if (!meetingUnavailable && !emptyBooking && session?.userid === props.booking.user?.id) {
      const callFrame = DailyIframe.createFrame({
        theme: {
          colors: {
            accent: "#FFF",
            accentText: "#111111",
            background: "#111111",
            backgroundAccent: "#111111",
            baseText: "#FFF",
            border: "#292929",
            mainAreaBg: "#111111",
            mainAreaBgAccent: "#111111",
            mainAreaText: "#FFF",
            supportiveText: "#FFF",
          },
        },
        showLeaveButton: true,
        iframeStyle: {
          position: "fixed",
          width: "100%",
          height: "100%",
        },
      });
      callFrame.join({
        url: props.booking.dailyRef?.dailyurl,
        showLeaveButton: true,
        token: props.booking.dailyRef?.dailytoken,
      });
    }
  }, [
    emptyBooking,
    meetingUnavailable,
    props.booking?.dailyRef?.dailytoken,
    props.booking?.dailyRef?.dailyurl,
    props.booking?.user?.id,
    session?.userid,
  ]);
  return (
    <>
      <Head>
        <title>Cal.com Video</title>
        <meta name="title" content="Cal.com Video" />
        <meta name="description" content={t("quick_video_meeting")} />
        <meta property="og:image" content="https://cal.com/video-og-image.png" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cal.com/video" />
        <meta property="og:title" content="Cal.com Video" />
        <meta property="og:description" content={t("quick_video_meeting")} />
        <meta property="twitter:image" content="https://cal.com/video-og-image.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://cal.com/video" />
        <meta property="twitter:title" content="Cal.com Video" />
        <meta property="twitter:description" content={t("quick_video_meeting")} />
      </Head>
      <div style={{ zIndex: 2, position: "relative" }}>
        <Link href="/" passHref>
          {
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="h-5·w-auto fixed z-10 hidden sm:inline-block"
              src="https://cal.com/logo-white.svg"
              alt="Cal.com Logo"
              style={{
                top: 46,
                left: 24,
              }}
            />
          }
        </Link>
        {JoinCall}
      </div>
    </>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid as string,
    },
    select: {
      uid: true,
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      user: {
        select: {
          id: true,
          credentials: true,
        },
      },
      attendees: true,
      dailyRef: {
        select: {
          dailyurl: true,
          dailytoken: true,
        },
      },
      references: {
        select: {
          uid: true,
          type: true,
        },
      },
    },
  });

  if (!booking) {
    // TODO: Booking is already cancelled
    return {
      props: { booking: null },
    };
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });
  const session = await getSession();

  return {
    props: {
      booking: bookingObj,
      session: session,
    },
  };
}
