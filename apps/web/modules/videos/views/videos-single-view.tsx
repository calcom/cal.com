"use client";

import type { DailyCall } from "@daily-co/daily-js";
import DailyIframe from "@daily-co/daily-js";
import { DailyProvider } from "@daily-co/daily-react";
import { useState, useEffect, useRef } from "react";

import dayjs from "@calcom/dayjs";
import classNames from "@calcom/lib/classNames";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { TRANSCRIPTION_STOPPED_ICON, RECORDING_DEFAULT_ICON } from "@calcom/lib/constants";
import { formatToLocalizedDate, formatToLocalizedTime } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Icon } from "@calcom/ui";

import type { getServerSideProps } from "@lib/video/[uid]/getServerSideProps";

import { CalAiTranscribe } from "~/videos/ai/ai-transcribe";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function JoinCall(props: PageProps) {
  const { meetingUrl, meetingPassword, booking, hasTeamPlan, calVideoLogo } = props;
  const [daily, setDaily] = useState<DailyCall | null>(null);

  useEffect(() => {
    let callFrame: DailyCall | undefined;
    try {
      callFrame = DailyIframe.createFrame({
        theme: {
          colors: {
            accent: "#FFF",
            accentText: "#111111",
            background: "#111111",
            backgroundAccent: "#111111",
            baseText: "#FFF",
            border: "#292929",
            mainAreaBg: "#111111",
            mainAreaBgAccent: "#1A1A1A",
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
        ...(hasTeamPlan && {
          customTrayButtons: {
            recording: {
              label: "Record",
              tooltip: "Start or stop recording",
              iconPath: RECORDING_DEFAULT_ICON,
              iconPathDarkMode: RECORDING_DEFAULT_ICON,
            },
            transcription: {
              label: "Cal.ai",
              tooltip: "Transcription powered by AI",
              iconPath: TRANSCRIPTION_STOPPED_ICON,
              iconPathDarkMode: TRANSCRIPTION_STOPPED_ICON,
            },
          },
        }),
      });
    } catch (err) {
      callFrame = DailyIframe.getCallInstance();
    } finally {
      setDaily(callFrame ?? null);

      callFrame?.join();
    }

    return () => {
      callFrame?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DailyProvider callObject={daily}>
      <div
        className="mx-auto hidden sm:block"
        style={{ zIndex: 2, left: "30%", position: "absolute", bottom: 100, width: "auto" }}>
        <CalAiTranscribe />
      </div>
      <div style={{ zIndex: 2, position: "relative" }}>
        {calVideoLogo ? (
          <img
            className="min-w-16 min-h-16 fixed z-10 hidden aspect-square h-16 w-16 rounded-full sm:inline-block"
            src={calVideoLogo}
            alt="My Org Logo"
            style={{
              top: 32,
              left: 32,
            }}
          />
        ) : (
          <img
            className="fixed z-10 hidden h-5 sm:inline-block"
            src={`${WEBSITE_URL}/cal-logo-word-dark.svg`}
            alt="Logo"
            style={{
              top: 47,
              left: 20,
            }}
          />
        )}
      </div>
      <VideoMeetingInfo booking={booking} />
    </DailyProvider>
  );
}

interface ProgressBarProps {
  startTime: string;
  endTime: string;
}

function ProgressBar(props: ProgressBarProps) {
  const { t } = useLocale();
  const { startTime, endTime } = props;
  const currentTime = dayjs().second(0).millisecond(0);
  const startingTime = dayjs(startTime).second(0).millisecond(0);
  const isPast = currentTime.isAfter(startingTime);
  const currentDifference = dayjs().diff(startingTime, "minutes");
  const startDuration = dayjs(endTime).diff(startingTime, "minutes");
  const [duration, setDuration] = useState(() => {
    if (currentDifference >= 0 && isPast) {
      return startDuration - currentDifference;
    } else {
      return startDuration;
    }
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = dayjs();
    const remainingMilliseconds = (60 - now.get("seconds")) * 1000 - now.get("milliseconds");

    timeoutRef.current = setTimeout(() => {
      const past = dayjs().isAfter(startingTime);

      if (past) {
        setDuration((prev) => prev - 1);
      }

      intervalRef.current = setInterval(() => {
        if (dayjs().isAfter(startingTime)) {
          setDuration((prev) => prev - 1);
        }
      }, 60000);
    }, remainingMilliseconds);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prev = startDuration - duration;
  const percentage = prev * (100 / startDuration);
  return (
    <div>
      <p>
        {duration} {t("minutes")}
      </p>
      <div className="relative h-2 max-w-xl overflow-hidden rounded-full">
        <div className="absolute h-full w-full bg-gray-500/10" />
        <div className={classNames("relative h-full bg-green-500")} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

interface VideoMeetingInfo {
  booking: PageProps["booking"];
}

export function VideoMeetingInfo(props: VideoMeetingInfo) {
  const [open, setOpen] = useState(false);
  const { booking } = props;
  const { t } = useLocale();

  const endTime = new Date(booking.endTime);
  const startTime = new Date(booking.startTime);

  return (
    <>
      <aside
        className={classNames(
          "no-scrollbar fixed left-0 top-0 z-30 flex h-full w-64 transform justify-between overflow-x-hidden overflow-y-scroll transition-all duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-[232px]"
        )}>
        <main className="prose-sm prose max-w-64 prose-a:text-white prose-h3:text-white prose-h3:font-cal scroll-bar scrollbar-track-w-20 w-full overflow-scroll overflow-x-hidden border-r border-gray-300/20 bg-black/80 p-4 text-white shadow-sm backdrop-blur-lg">
          <h3>{t("what")}:</h3>
          <p>{booking.title}</p>
          <h3>{t("invitee_timezone")}:</h3>
          <p>{booking.user?.timeZone}</p>
          <h3>{t("when")}:</h3>
          <p suppressHydrationWarning={true}>
            {formatToLocalizedDate(startTime)} <br />
            {formatToLocalizedTime(startTime)}
          </p>
          <h3>{t("time_left")}</h3>
          <ProgressBar
            key={String(open)}
            endTime={endTime.toISOString()}
            startTime={startTime.toISOString()}
          />

          <h3>{t("who")}:</h3>
          <p>
            {booking?.user?.name} - {t("organizer")}:{" "}
            <a href={`mailto:${booking?.user?.email}`}>{booking?.user?.email}</a>
          </p>

          {booking.attendees.length
            ? booking.attendees.map((attendee) => (
                <p key={attendee.id}>
                  {attendee.name} – <a href={`mailto:${attendee.email}`}>{attendee.email}</a>
                </p>
              ))
            : null}

          {booking.description && (
            <>
              <h3>{t("description")}:</h3>

              <div
                className="prose-sm prose prose-invert"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(booking.description) }}
              />
            </>
          )}
        </main>
        <div className="flex items-center justify-center">
          <button
            aria-label={`${open ? "close" : "open"} booking description sidebar`}
            className="h-20 w-6 rounded-r-md border border-l-0 border-gray-300/20 bg-black/60 text-white shadow-sm backdrop-blur-lg"
            onClick={() => setOpen(!open)}>
            <Icon
              name="chevron-right"
              aria-hidden
              className={classNames(open && "rotate-180", "w-5 transition-all duration-300 ease-in-out")}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
