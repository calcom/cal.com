import { m } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { shallow } from "zustand/shallow";

import { Timezone as PlatformTimezoneSelect } from "@calcom/atoms/timezone";
import { useEmbedUiConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { EventDetails, EventMembers, EventMetaSkeleton, EventTitle } from "@calcom/features/bookings";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { Timezone } from "@calcom/features/bookings/Booker/types";
import { SeatsAvailabilityText } from "@calcom/features/bookings/components/SeatsAvailabilityText";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTMLClient } from "@calcom/lib/markdownToSafeHTMLClient";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

import i18nConfigration from "../../../../../i18n.json";
import { fadeInUp } from "../config";
import { FromToTime } from "../utils/dates";
import { useBookerTime } from "./hooks/useBookerTime";

const WebTimezoneSelect = dynamic(
  () => import("@calcom/features/components/timezone-select").then((mod) => mod.TimezoneSelect),
  {
    ssr: false,
  }
);

const getTranslatedField = (
  translations: Array<Pick<EventTypeTranslation, "field" | "targetLocale" | "translatedText">>,
  field: EventTypeAutoTranslatedField,
  userLocale: string
) => {
  const i18nLocales = i18nConfigration.locale.targets.concat([i18nConfigration.locale.source]);

  return translations?.find(
    (trans) =>
      trans.field === field &&
      i18nLocales.includes(trans.targetLocale) &&
      (userLocale === trans.targetLocale || userLocale.split("-")[0] === trans.targetLocale)
  )?.translatedText;
};

const ScrollFadeDescription = ({
  html,
  collapsedMaxHeight = 180,
  fadePx = 28,
  linesFromBottomToUnfade = 2,
}: {
  html: string | null;
  collapsedMaxHeight?: number;
  fadePx?: number;
  linesFromBottomToUnfade?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);
  const lineHeightCache = useRef<number | null>(null);

  // Memoize the update function to avoid recreating it on every render
  const update = useMemo(
    () => () => {
      const el = ref.current;
      if (!el) return;

      const overflow = el.scrollHeight > el.clientHeight + 1;
      if (!overflow) {
        setShowFade(false);
        return;
      }

      // Cache line height calculation to avoid repeated getComputedStyle calls
      if (lineHeightCache.current === null) {
        const cs = window.getComputedStyle(el);
        let lineHeight = parseFloat(cs.lineHeight || "0");
        if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
          const fontSize = parseFloat(cs.fontSize || "16");
          lineHeight = Math.round(fontSize * 1.4);
        }
        lineHeightCache.current = lineHeight;
      }

      const bottomThresholdPx = Math.max(fadePx, lineHeightCache.current * linesFromBottomToUnfade);
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - bottomThresholdPx;

      setShowFade(!nearBottom);
    },
    [fadePx, linesFromBottomToUnfade]
  );

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [html, update]);

  // Memoize mask calculation
  const maskStyle = useMemo(
    () =>
      showFade
        ? `linear-gradient(to bottom, black calc(100% - ${fadePx}px), transparent 100%)`
        : "none",
    [showFade, fadePx]
  );

  // Memoize inline styles
  const scrollContainerStyle = useMemo(
    () => ({
      maxHeight: `${collapsedMaxHeight}px`,
      overflowY: "auto" as const,
      WebkitMaskImage: maskStyle,
      maskImage: maskStyle,
    }),
    [collapsedMaxHeight, maskStyle]
  );

  return (
    <div className="relative">
      <div ref={ref} className="scroll-bar pr-4" style={scrollContainerStyle}>
        <div
          dangerouslySetInnerHTML={{
            __html: html || "",
          }}
        />
      </div>
    </div>
  );
};

export const EventMeta = ({
  event,
  isPending,
  isPlatform = true,
  isPrivateLink,
  classNames,
  locale,
  timeZones,
  children,
  selectedTimeslot,
  roundRobinHideOrgAndTeam,
}: {
  event?: Pick<
    BookerEvent,
    | "lockTimeZoneToggleOnBookingPage"
    | "lockedTimeZone"
    | "schedule"
    | "seatsPerTimeSlot"
    | "subsetOfUsers"
    | "length"
    | "schedulingType"
    | "profile"
    | "entity"
    | "description"
    | "title"
    | "metadata"
    | "locations"
    | "currency"
    | "requiresConfirmation"
    | "recurringEvent"
    | "price"
    | "isDynamic"
    | "fieldTranslations"
    | "autoTranslateDescriptionEnabled"
  > | null;
  isPending: boolean;
  isPrivateLink: boolean;
  isPlatform?: boolean;
  classNames?: {
    eventMetaContainer?: string;
    eventMetaTitle?: string;
    eventMetaTimezoneSelect?: string;
    eventMetaChildren?: string;
  };
  locale?: string | null;
  timeZones?: Timezone[];
  children?: React.ReactNode;
  selectedTimeslot: string | null;
  roundRobinHideOrgAndTeam?: boolean;
}) => {
  const { timeFormat, timezone } = useBookerTime();
  const [setTimezone] = useTimePreferences((state) => [state.setTimezone]);
  const [setBookerStoreTimezone] = useBookerStoreContext((state) => [state.setTimezone], shallow);
  const selectedDuration = useBookerStoreContext((state) => state.selectedDuration);
  const bookerState = useBookerStoreContext((state) => state.state);
  const bookingData = useBookerStoreContext((state) => state.bookingData);
  const rescheduleUid = useBookerStoreContext((state) => state.rescheduleUid);
  const [seatedEventData, setSeatedEventData] = useBookerStoreContext(
    (state) => [state.seatedEventData, state.setSeatedEventData],
    shallow
  );
  const { i18n, t } = useLocale();
  const embedUiConfig = useEmbedUiConfig();
  const isEmbed = useIsEmbed();
  const hideEventTypeDetails = isEmbed ? embedUiConfig.hideEventTypeDetails : false;
  const [TimezoneSelect] = useMemo(
    () => (isPlatform ? [PlatformTimezoneSelect] : [WebTimezoneSelect]),
    [isPlatform]
  );

  useEffect(() => {
    //In case the event has lockTimeZone enabled ,set the timezone to event's locked timezone
    if (event?.lockTimeZoneToggleOnBookingPage) {
      const timezone = event.lockedTimeZone || event.schedule?.timeZone;
      if (timezone) {
        setTimezone(timezone);
      }
    }
  }, [event, setTimezone]);

  if (hideEventTypeDetails) {
    return null;
  }
  // If we didn't pick a time slot yet, we load bookingData via SSR so bookingData should be set
  // Otherwise we load seatedEventData from useBookerStore
  const bookingSeatAttendeesQty = seatedEventData?.attendees || bookingData?.attendees.length;
  const eventTotalSeats = seatedEventData?.seatsPerTimeSlot || event?.seatsPerTimeSlot;

  const isHalfFull =
    bookingSeatAttendeesQty && eventTotalSeats && bookingSeatAttendeesQty / eventTotalSeats >= 0.5;
  const isNearlyFull =
    bookingSeatAttendeesQty && eventTotalSeats && bookingSeatAttendeesQty / eventTotalSeats >= 0.83;

  const colorClass = isNearlyFull
    ? "text-rose-600"
    : isHalfFull
    ? "text-yellow-500"
    : "text-bookinghighlight";
  const userLocale = locale ?? navigator.language;
  const translatedDescription = getTranslatedField(
    event?.fieldTranslations ?? [],
    EventTypeAutoTranslatedField.DESCRIPTION,
    userLocale
  );
  const translatedTitle = getTranslatedField(
    event?.fieldTranslations ?? [],
    EventTypeAutoTranslatedField.TITLE,
    userLocale
  );

  return (
    <div className={`${classNames?.eventMetaContainer || ""} relative z-10 p-6`} data-testid="event-meta">
      {isPending && (
        <m.div {...fadeInUp} initial="visible" layout>
          <EventMetaSkeleton />
        </m.div>
      )}
      {!isPending && !!event && (
        <m.div {...fadeInUp} layout transition={{ ...fadeInUp.transition, delay: 0.3 }}>
          <EventMembers
            schedulingType={event.schedulingType}
            users={event.subsetOfUsers}
            profile={event.profile}
            entity={event.entity}
            isPrivateLink={isPrivateLink}
            roundRobinHideOrgAndTeam={roundRobinHideOrgAndTeam}
          />
          <EventTitle className={`${classNames?.eventMetaTitle} my-2`}>
            {translatedTitle ?? event?.title}
          </EventTitle>
          {(event.description || translatedDescription) && (
            <EventMetaBlock
              data-testid="event-meta-description"
              contentClassName="mb-8 wrap-break-word max-w-full">
              <ScrollFadeDescription
                html={markdownToSafeHTMLClient(translatedDescription ?? event.description)}
              />
            </EventMetaBlock>
          )}
          <div className="stack-y-4 font-medium rtl:-mr-2">
            {rescheduleUid && bookingData && (
              <EventMetaBlock icon="calendar">
                {t("former_time")}
                <br />
                <span className="line-through" data-testid="former_time_p">
                  <FromToTime
                    date={bookingData.startTime.toString()}
                    duration={null}
                    timeFormat={timeFormat}
                    timeZone={timezone}
                    language={i18n.language}
                  />
                </span>
              </EventMetaBlock>
            )}
            {selectedTimeslot && (
              <EventMetaBlock icon="calendar">
                <FromToTime
                  date={selectedTimeslot}
                  duration={selectedDuration || event.length}
                  timeFormat={timeFormat}
                  timeZone={timezone}
                  language={i18n.language}
                />
              </EventMetaBlock>
            )}
            <EventDetails event={event} />
            <EventMetaBlock
              className="cursor-pointer [&_.current-timezone:before]:focus-within:opacity-100 [&_.current-timezone:before]:hover:opacity-100"
              contentClassName="relative max-w-[90%]"
              icon="globe">
              {bookerState === "booking" ? (
                <>{timezone}</>
              ) : (
                <span
                  className={`current-timezone before:bg-subtle min-w-32 -mt-[2px] flex h-6 max-w-full items-center justify-start before:absolute before:inset-0 before:bottom-[-3px] before:left-[-30px] before:top-[-3px] before:w-[calc(100%+35px)] before:rounded-md before:py-3 before:opacity-0 before:transition-opacity ${
                    event.lockTimeZoneToggleOnBookingPage ? "cursor-not-allowed" : ""
                  }`}
                  data-testid="event-meta-current-timezone">
                  <TimezoneSelect
                    timeZones={timeZones}
                    menuPosition="absolute"
                    timezoneSelectCustomClassname={classNames?.eventMetaTimezoneSelect}
                    classNames={{
                      control: () =>
                        "min-h-0! p-0 w-full border-0 bg-transparent focus-within:ring-0 shadow-none!",
                      menu: () => "w-64! max-w-[90vw] mb-1 ",
                      singleValue: () => "text-text py-1",
                      indicatorsContainer: () => "ml-auto",
                      container: () => "max-w-full",
                    }}
                    value={
                      event.lockTimeZoneToggleOnBookingPage
                        ? event.lockedTimeZone || CURRENT_TIMEZONE
                        : timezone
                    }
                    onChange={({ value }) => {
                      setTimezone(value);
                      setBookerStoreTimezone(value);
                    }}
                    isDisabled={event.lockTimeZoneToggleOnBookingPage}
                  />
                </span>
              )}
            </EventMetaBlock>
            {bookerState === "booking" && eventTotalSeats && bookingSeatAttendeesQty ? (
              <EventMetaBlock icon="user" className={`${colorClass}`}>
                <div className="text-bookinghighlight flex items-start text-sm">
                  <p>
                    <SeatsAvailabilityText
                      showExact={!!seatedEventData.showAvailableSeatsCount}
                      totalSeats={eventTotalSeats}
                      bookedSeats={bookingSeatAttendeesQty || 0}
                      variant="fraction"
                    />
                  </p>
                </div>
              </EventMetaBlock>
            ) : null}
          </div>
          {children && <div className={classNames?.eventMetaChildren}>{children}</div>}
        </m.div>
      )}
    </div>
  );
};
