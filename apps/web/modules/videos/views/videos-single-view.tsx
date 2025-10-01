"use client";

import type { DailyCall } from "@daily-co/daily-js";
import DailyIframe from "@daily-co/daily-js";
import { DailyProvider } from "@daily-co/daily-react";
import { useDailyEvent } from "@daily-co/daily-react";
import { useState, useEffect, useRef, useCallback } from "react";

import dayjs from "@calcom/dayjs";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { TRANSCRIPTION_STOPPED_ICON, RECORDING_DEFAULT_ICON } from "@calcom/lib/constants";
import { formatToLocalizedDate, formatToLocalizedTime } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Input } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import type { getServerSideProps } from "@lib/video/[uid]/getServerSideProps";

import { CalVideoPremiumFeatures } from "../cal-video-premium-features";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function JoinCall(props: PageProps) {
  const { t } = useLocale();
  const {
    meetingUrl,
    meetingPassword,
    booking,
    hasTeamPlan,
    calVideoLogo,
    displayLogInOverlay,
    loggedInUserName,
    overrideName,
    showRecordingButton,
    enableAutomaticTranscription,
    enableAutomaticRecordingForOrganizer,
    showTranscriptionButton,
    rediectAttendeeToOnExit,
  } = props;
  const [daily, setDaily] = useState<DailyCall | null>(null);
  const [userNameForCall, setUserNameForCall] = useState<string | undefined>(
    overrideName ?? loggedInUserName ?? undefined
  );
  const [isUserNameConfirmed, setIsUserNameConfirmed] = useState<boolean>(!displayLogInOverlay);
  const [isCallFrameReady, setIsCallFrameReady] = useState<boolean>(false);

  const createCallFrame = useCallback(
    (userName?: string) => {
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
          userName: userName,
          ...(typeof meetingPassword === "string" && { token: meetingPassword }),
          ...(hasTeamPlan && {
            customTrayButtons: {
              ...(showRecordingButton
                ? {
                    recording: {
                      label: t("record"),
                      tooltip: t("start_or_stop_recording"),
                      iconPath: RECORDING_DEFAULT_ICON,
                      iconPathDarkMode: RECORDING_DEFAULT_ICON,
                    },
                  }
                : {}),
              ...(showTranscriptionButton
                ? {
                    transcription: {
                      label: t("transcribe"),
                      tooltip: t("transcription_powered_by_ai"),
                      iconPath: TRANSCRIPTION_STOPPED_ICON,
                      iconPathDarkMode: TRANSCRIPTION_STOPPED_ICON,
                    },
                  }
                : {}),
            },
          }),
        });

        if (userName) {
          callFrame.setUserName(userName);
        }

        return callFrame;
      } catch (err) {
        return DailyIframe.getCallInstance();
      }
    },
    [meetingUrl, meetingPassword, hasTeamPlan, showRecordingButton, showTranscriptionButton, t]
  );

  useEffect(() => {
    if (displayLogInOverlay && !loggedInUserName && !overrideName && !isUserNameConfirmed) {
      return;
    }

    let callFrame: DailyCall | null = null;

    try {
      callFrame = createCallFrame(userNameForCall) ?? null;
      setDaily(callFrame);
      setIsCallFrameReady(true);

      callFrame?.join();
    } catch (error) {
      console.error("Failed to create or join call:", error);
    }

    return () => {
      if (callFrame) {
        try {
          callFrame.destroy();
        } catch (error) {
          console.error("Error destroying call frame:", error);
        }
      }
      setDaily(null);
      setIsCallFrameReady(false);
    };
  }, [
    displayLogInOverlay,
    isUserNameConfirmed,
    userNameForCall,
    createCallFrame,
    loggedInUserName,
    overrideName,
  ]);

  const handleJoinAsGuest = useCallback((guestName: string) => {
    const trimmedName = guestName.trim();
    if (!trimmedName) {
      return;
    }

    setUserNameForCall(trimmedName);
    setIsUserNameConfirmed(true);
  }, []);

  const handleUserNameConfirmed = useCallback(() => {
    setIsUserNameConfirmed(true);
  }, []);

  return (
    <DailyProvider callObject={daily}>
      {isCallFrameReady && (
        <div
          className="mx-auto hidden sm:block"
          style={{ zIndex: 2, left: "30%", position: "absolute", bottom: 100, width: "auto" }}>
          <CalVideoPremiumFeatures
            showRecordingButton={showRecordingButton}
            enableAutomaticRecordingForOrganizer={enableAutomaticRecordingForOrganizer}
            enableAutomaticTranscription={enableAutomaticTranscription}
            showTranscriptionButton={showTranscriptionButton}
          />
        </div>
      )}
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
      {displayLogInOverlay && !isUserNameConfirmed && (
        <LogInOverlay
          isLoggedIn={!!loggedInUserName}
          bookingUid={booking.uid}
          loggedInUserName={loggedInUserName ?? undefined}
          overrideName={overrideName}
          onJoinAsGuest={handleJoinAsGuest}
          onUserNameConfirmed={handleUserNameConfirmed}
        />
      )}

      <VideoMeetingInfo booking={booking} rediectAttendeeToOnExit={rediectAttendeeToOnExit} />
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
  }, [startingTime]);

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

interface LogInOverlayProps {
  isLoggedIn: boolean;
  bookingUid: string;
  loggedInUserName?: string;
  overrideName?: string;
  onJoinAsGuest: (guestName: string) => void;
  onUserNameConfirmed?: () => void;
}

export function LogInOverlay(props: LogInOverlayProps) {
  const { t } = useLocale();
  const { bookingUid, isLoggedIn, loggedInUserName, overrideName, onJoinAsGuest, onUserNameConfirmed } =
    props;

  const [isOpen, setIsOpen] = useState(!isLoggedIn);
  const [userName, setUserName] = useState(overrideName ?? loggedInUserName ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinueAsGuest = useCallback(async () => {
    const trimmedName = userName.trim();
    if (!trimmedName) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      onJoinAsGuest(trimmedName);
      onUserNameConfirmed?.();
      setIsOpen(false);
    } catch (error) {
      console.error("Error joining as guest:", error);
      const errorMessage = error instanceof Error ? error.message : t("failed_to_join_call");

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userName, onJoinAsGuest, onUserNameConfirmed, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && userName.trim() && !isLoading) {
        handleContinueAsGuest();
      }
    },
    [userName, isLoading, handleContinueAsGuest]
  );

  const handleUserNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUserName(e.target.value);
      if (error) {
        setError(null);
      }
    },
    [error]
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        title={t("join_video_call")}
        description={t("choose_how_you_d_like_to_appear_on_the_call")}
        className="bg-white text-black dark:bg-black dark:text-white sm:max-w-[480px]">
        <div className="pb-4">
          <div className="space-y-4">
            <div>
              <div className="font-semibold">{t("join_as_guest")}</div>
              <p className="text-subtle text-sm">{t("ideal_for_one_time_calls")}</p>
            </div>

            <div className="flex gap-4">
              <Input
                type="text"
                placeholder={t("your_name")}
                className="w-full flex-1"
                value={userName}
                onChange={handleUserNameChange}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                autoFocus
              />
              <Button color="secondary" onClick={handleContinueAsGuest} loading={isLoading}>
                {t("continue")}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <hr className="my-5 h-0.5 border-t-0 bg-neutral-100 dark:bg-white/10" />

          <div className="mt-5 space-y-4">
            <div>
              <h4 className="text-base font-semibold text-black dark:text-white">
                {t("sign_in_to_cal_com")}
              </h4>
              <p className="text-sm text-[#6B7280] dark:text-gray-300">
                {t("track_meetings_and_manage_schedule")}
              </p>
            </div>

            <Button
              color="primary"
              className="w-full justify-center"
              onClick={() =>
                (window.location.href = `${WEBAPP_URL}/auth/login?callbackUrl=${WEBAPP_URL}/video/${bookingUid}`)
              }>
              {t("sign_in")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface VideoMeetingInfo {
  booking: PageProps["booking"];
  rediectAttendeeToOnExit?: string | null;
}

export function VideoMeetingInfo(props: VideoMeetingInfo) {
  const [open, setOpen] = useState(false);
  const { booking, rediectAttendeeToOnExit } = props;
  const { t } = useLocale();

  const endTime = new Date(booking.endTime);
  const startTime = new Date(booking.startTime);
  const timeZone = booking.user?.timeZone;

  useDailyEvent("left-meeting", () => {
    if (rediectAttendeeToOnExit) {
      window.location.href = rediectAttendeeToOnExit;
    }
  });

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
          <p>{timeZone}</p>
          <h3>{t("when")}:</h3>
          <p suppressHydrationWarning={true}>
            {formatToLocalizedDate(startTime)} <br />
            {formatToLocalizedTime({ date: startTime, timeZone })}
          </p>
          <h3>{t("time_left")}</h3>
          <ProgressBar
            key={String(open)}
            endTime={endTime.toISOString()}
            startTime={startTime.toISOString()}
          />

          <h3>{t("who")}:</h3>
          <p>
            {booking?.user?.name} - {t("organizer")}
            {!booking?.eventType?.hideOrganizerEmail && (
              <>
                : <a href={`mailto:${booking?.user?.email}`}>{booking?.user?.email}</a>
              </>
            )}
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
