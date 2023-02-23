import DailyIframe from "@daily-co/daily-js";
import type { GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";
import Head from "next/head";
import { useEffect, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { APP_NAME, SEO_IMG_OGIMG_VIDEO, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { FiChevronRight } from "@calcom/ui/components/icon";

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
      <VideoMeetingInfo />
    </>
  );
}

export function VideoMeetingInfo() {
  const [open, setOpen] = useState(false);

  const progress = 20; // in percent

  return (
    <>
      <aside
        className={classNames(
          "fixed top-0 z-30 flex h-full w-64 transform justify-between border-r border-gray-300/20 bg-black/80 backdrop-blur-lg transition-all duration-300 ease-in-out",
          open ? "left-0" : "-left-64"
        )}>
        <main className="prose prose-sm max-w-64 prose-h3:text-white prose-h3:font-cal overflow-scroll p-4 text-white shadow-sm">
          <h3>What:</h3>
          <p>30 Minute Meeting</p>
          <h3>Invitee Time Zone:</h3>
          <p>America/Detroit</p>
          <h3>When:</h3>
          <p>
            Thursday 23rd February 2023 <br />
            11:10 am (CET)
          </p>
          <h3>Time left</h3>
          <p>23 minutes</p>
          <div className="relative h-2 max-w-xl overflow-hidden rounded-full">
            <div className="absolute h-full w-full bg-gray-500/10" />
            <div className={classNames("relative h-full bg-green-500", `w-[${progress}%]`)} />
          </div>
          <h3>Who:</h3>
          <p>Peer Richelsen - Organizer peer@cal.com</p>
          <p>sunil pai, inc. – sunil@partykit.io</p>
          <h3>Description</h3>
          <p>With Peer Richelsen, Co-Founder & Co-CEO of Cal.com</p>
        </main>
        <div className="-mr-6 flex items-center justify-center">
          <button
            className="h-20 w-6 rounded-r-md border border-l-0 border-gray-300/20 bg-black/60 text-white shadow-sm backdrop-blur-lg"
            onClick={() => setOpen(!open)}>
            <FiChevronRight
              className={classNames(open && "rotate-180", "w-5 transition-all duration-300 ease-in-out")}
            />
          </button>
        </div>
      </aside>
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
