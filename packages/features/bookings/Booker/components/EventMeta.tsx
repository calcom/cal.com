import { m } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

import { useEmbedUiConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { EventMembers, EventMetaSkeleton, EventTitle } from "@calcom/features/bookings";
import { SeatsAvailabilityText } from "@calcom/features/bookings/components/SeatsAvailabilityText";
import { EventMetaBlock } from "@calcom/features/bookings/components/event-meta/Details";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { markdownToSafeHTMLClient } from "@calcom/lib/markdownToSafeHTMLClient";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

import i18nConfigration from "../../../../../i18n.json";
import { fadeInUp } from "../config";
import { useBookerStore } from "../store";

const MOBILE_WIDTH = 768;

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

export const EventMeta = ({
  event,
  isPending,
  isPrivateLink,
  classNames,
  locale,
}: {
  event?: Pick<
    BookerEvent,
    | "lockTimeZoneToggleOnBookingPage"
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
  isOcurrence: boolean;
  classNames?: {
    eventMetaContainer?: string;
    eventMetaTitle?: string;
    eventMetaTimezoneSelect?: string;
  };
  locale?: string | null;
}) => {
  const [setTimezone] = useTimePreferences((state) => [state.setTimezone]);
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const bookerState = useBookerStore((state) => state.state);
  const bookingData = useBookerStore((state) => state.bookingData);
  const [seatedEventData] = useBookerStore(
    (state) => [state.seatedEventData, state.setSeatedEventData],
    shallow
  );
  const embedUiConfig = useEmbedUiConfig();
  const isEmbed = useIsEmbed();
  const pathname = usePathname();
  const [showMessage, setShowMessage] = useState(false);
  const hideEventTypeDetails = isEmbed ? embedUiConfig.hideEventTypeDetails : false;

  useEffect(() => {
    //In case the event has lockTimeZone enabled ,set the timezone to event's attached availability timezone
    if (event && event?.lockTimeZoneToggleOnBookingPage && event?.schedule?.timeZone) {
      setTimezone(event.schedule?.timeZone);
    }
  }, [event, setTimezone]);

  useEffect(() => {
    const hasRecurrenceInPath = pathname!.includes("semanal") || pathname!.includes("quinzenal");
    const handleResize = () => {
      setShowMessage(window.innerWidth < MOBILE_WIDTH && hasRecurrenceInPath);
    };

    window.addEventListener("resize", handleResize);

    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [pathname]);

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

  const startDate = selectedTimeslot ? new Date(selectedTimeslot) : new Date();

  return (
    <div
      className={`${classNames?.eventMetaContainer || ""} relative z-10 p-4 md:p-10`}
      data-testid="event-meta">
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
          />
          <EventTitle className={`${classNames?.eventMetaTitle} my-2`}>
            {translatedTitle ?? event?.title}
          </EventTitle>
          {(event.description || translatedDescription) && (
            <EventMetaBlock contentClassName="mb-8 break-words max-w-full max-h-[180px] scroll-bar pr-4">
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: markdownToSafeHTMLClient(translatedDescription ?? event.description),
                }}
              />
            </EventMetaBlock>
          )}
          <div>
            <div
              className={`${
                showMessage ? "flex-col items-start " : "items-center "
              }mb-4 flex gap-4 space-y-4 font-medium md:ml-28 md:pl-2`}>
              {/* {rescheduleUid && bookingData && (
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
              )} */}
              {/* {selectedTimeslot && (
                <EventMetaBlock icon="calendar">
                  <FromToTime
                    date={selectedTimeslot}
                    duration={selectedDuration || event.length}
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
                  className={`current-timezone before:bg-subtle min-w-32 -mt-[2px] flex h-6 max-w-full items-center justify-start before:absolute before:inset-0 before:bottom-[-3px] before:left-[-30px] before:top-[-3px] before:w-[calc(100%_+_35px)] before:rounded-md before:py-3 before:opacity-0 before:transition-opacity ${
                    event.lockTimeZoneToggleOnBookingPage ? "cursor-not-allowed" : ""
                  }`}>
                  <TimezoneSelect
                    menuPosition="absolute"
                    timezoneSelectCustomClassname={classNames?.eventMetaTimezoneSelect}
                    classNames={{
                      control: () =>
                        "!min-h-0 p-0 w-full border-0 bg-transparent focus-within:ring-0 shadow-none!",
                      menu: () => "!w-64 max-w-[90vw] mb-1 ",
                      singleValue: () => "text-text py-1",
                      indicatorsContainer: () => "ml-auto",
                      container: () => "max-w-full",
                    }}
                    value={event.lockTimeZoneToggleOnBookingPage ? CURRENT_TIMEZONE : timezone}
                    onChange={({ value }) => {
                      setTimezone(value);
                      setBookerStoreTimezone(value);
                    }}
                    isDisabled={event.lockTimeZoneToggleOnBookingPage}
                  />
                  A partir de {date}, {time}
                </span>
              )}
              <EventDetails event={event} isOcurrence={isOcurrence} />
              {/* <EventMetaBlock
                className=".event-meta-block-fix cursor-pointer [&_.current-timezone:before]:focus-within:opacity-100 [&_.current-timezone:before]:hover:opacity-100"
                contentClassName="relative max-w-[90%]"
                icon="globe">
                {bookerState === "booking" ? (
                  <>{timezone}</>
                ) : (
                  <span
                    className={`min-w-32 current-timezone before:bg-subtle -mt-[2px] flex h-6 max-w-full items-center justify-start before:absolute before:inset-0 before:bottom-[-3px] before:left-[-30px] before:top-[-3px] before:w-[calc(100%_+_35px)] before:rounded-md before:py-3 before:opacity-0 before:transition-opacity ${
                      event.lockTimeZoneToggleOnBookingPage ? "cursor-not-allowed" : ""
                    }`}>
                    <TimezoneSelect
                      menuPosition="fixed"
                      timezoneSelectCustomClassname={classNames?.eventMetaTimezoneSelect}
                      classNames={{
                        control: () => "!min-h-0 p-0 w-full border-0 bg-transparent focus-within:ring-0",
                        menu: () => "!w-64 max-w-[90vw]",
                        singleValue: () => "text-text py-1",
                        indicatorsContainer: () => "ml-auto",
                        container: () => "max-w-full",
                      }}
                      value={timezone}
                      onChange={(tz) => setTimezone(tz.value)}
                      isDisabled={event.lockTimeZoneToggleOnBookingPage}
                    />
                  </span>
                )}
              </EventMetaBlock> */}
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
            {showMessage && (
              <span className="text-base">
                O dia da semana e horário escolhidos serão reservados para você nas próximas semanas conforme
                o plano escolhido.
              </span>
            )}
          </div>
        </m.div>
      )}
    </div>
  );
};
