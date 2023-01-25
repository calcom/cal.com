import DailyIframe from "@daily-co/daily-js";
import { GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";
import Head from "next/head";
import { useEffect } from "react";

import { APP_NAME, SEO_IMG_OGIMG_VIDEO, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";

import { ssrInit } from "@server/lib/ssr";

export type JoinCallPageProps = inferSSRProps<typeof getServerSideProps>;

export default function JoinCall(props: JoinCallPageProps) {
  const { t } = useLocale();
  const { meetingUrl, meetingPassword } = props;

  useEffect(() => {
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
      url: meetingUrl,
      ...(typeof meetingPassword === "string" && { token: meetingPassword }),
    });
    callFrame.join();
    return () => {
      callFrame.destroy();
    };
  }, []);

  const title = `${APP_NAME} Video`;
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="title" content={APP_NAME + " Video"} />
        <meta name="description" content={t("quick_video_meeting")} />
        <meta property="og:image" content={SEO_IMG_OGIMG_VIDEO} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${WEBSITE_URL}/video`} />
        <meta property="og:title" content={APP_NAME + " Video"} />
        <meta property="og:description" content={t("quick_video_meeting")} />
        <meta property="twitter:image" content={SEO_IMG_OGIMG_VIDEO} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`${WEBSITE_URL}/video`} />
        <meta property="twitter:title" content={APP_NAME + " Video"} />
        <meta property="twitter:description" content={t("quick_video_meeting")} />
      </Head>
      <div style={{ zIndex: 2, position: "relative" }}>
        <img
          className="h-5·w-auto fixed z-10 hidden sm:inline-block"
          src={`${WEBSITE_URL}/cal-logo-word-dark.svg`}
          alt="Cal.com Logo"
          style={{
            top: 46,
            left: 24,
          }}
        />
      </div>
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);

  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid as string,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      user: {
        select: {
          id: true,
          credentials: true,
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
    return {
      redirect: {
        destination: "/video/no-meeting-found",
        permanent: false,
      },
    };
  }

  //daily.co calls have a 60 minute exit buffer when a user enters a call when it's not available it will trigger the modals
  const now = new Date();
  const exitDate = new Date(now.getTime() - 60 * 60 * 1000);

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
  const session = await getSession();

  // set meetingPassword to null for guests
  if (session?.user.id !== bookingObj.user?.id) {
    bookingObj.references.forEach((bookRef) => {
      bookRef.meetingPassword = null;
    });
  }

  return {
    props: {
      meetingUrl: bookingObj.references[0].meetingUrl ?? "",
      ...(typeof bookingObj.references[0].meetingPassword === "string" && {
        meetingPassword: bookingObj.references[0].meetingPassword,
      }),
      trpcState: ssr.dehydrate(),
    },
  };
}
