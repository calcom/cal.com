// Get router variables
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CreditCardIcon,
  GlobeIcon,
  InformationCircleIcon,
  LocationMarkerIcon,
  RefreshIcon,
  VideoCameraIcon,
} from "@heroicons/react/solid";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useContracts } from "contexts/contractsContext";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import { TFunction } from "next-i18next";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";
import { Frequency as RRuleFrequency } from "rrule";

import { AppStoreLocationType, LocationObject, LocationType } from "@calcom/app-store/locations";
import {
  useEmbedStyles,
  useIsEmbed,
  useIsBackgroundTransparent,
  sdkActionManager,
  useEmbedNonStylesConfig,
} from "@calcom/embed-core/embed-iframe";
import classNames from "@calcom/lib/classNames";
import { CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { useExposePlanGlobally } from "@lib/hooks/useExposePlanGlobally";
import useTheme from "@lib/hooks/useTheme";
import { isBrandingHidden } from "@lib/isBrandingHidden";
import { parseDate } from "@lib/parseDate";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { detectBrowserTimeFormat } from "@lib/timeFormat";

import CustomBranding from "@components/CustomBranding";
import AvailableTimes from "@components/booking/AvailableTimes";
import DatePicker from "@components/booking/DatePicker";
import TimeOptions from "@components/booking/TimeOptions";
import { HeadSeo } from "@components/seo/head-seo";
import AvatarGroup from "@components/ui/AvatarGroup";
import PoweredByCal from "@components/ui/PoweredByCal";

import { AvailabilityPageProps } from "../../../pages/[user]/[type]";
import { AvailabilityTeamPageProps } from "../../../pages/team/[slug]/[type]";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

type Props = AvailabilityTeamPageProps | AvailabilityPageProps;

export const locationKeyToString = (location: LocationObject, t: TFunction) => {
  switch (location.type) {
    case LocationType.InPerson:
      return location.address || "In Person"; // If disabled address won't exist on the object
    case LocationType.Link:
      return location.link || "Link"; // If disabled link won't exist on the object
    case LocationType.Phone:
      return t("your_number");
    case LocationType.UserPhone:
      return t("phone_call");
    case LocationType.GoogleMeet:
      return "Google Meet";
    case LocationType.Zoom:
      return "Zoom";
    case LocationType.Daily:
      return "Cal Video";
    case LocationType.Jitsi:
      return "Jitsi";
    case LocationType.Huddle01:
      return "Huddle Video";
    case LocationType.Tandem:
      return "Tandem";
    case LocationType.Teams:
      return "Microsoft Teams";
    default:
      return null;
  }
};

const AvailabilityPage = ({ profile, plan, eventType, workingHours, previousPage, booking }: Props) => {
  const router = useRouter();
  const isEmbed = useIsEmbed();
  const { rescheduleUid } = router.query;
  const { isReady, Theme } = useTheme(profile.theme);
  const { t, i18n } = useLocale();
  const { contracts } = useContracts();
  const availabilityDatePickerEmbedStyles = useEmbedStyles("availabilityDatePicker");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const isBackgroundTransparent = useIsBackgroundTransparent();
  useExposePlanGlobally(plan);
  useEffect(() => {
    if (eventType.metadata.smartContractAddress) {
      const eventOwner = eventType.users[0];
      if (!contracts[(eventType.metadata.smartContractAddress || null) as number])
        router.replace(`/${eventOwner.username}`);
    }
  }, [contracts, eventType.metadata.smartContractAddress, eventType.users, router]);

  const selectedDate = useMemo(() => {
    const dateString = asStringOrNull(router.query.date);
    if (dateString) {
      const offsetString = dateString.substr(11, 14); // hhmm
      const offsetSign = dateString.substr(10, 1); // + or -

      const offsetHour = offsetString.slice(0, -2);
      const offsetMinute = offsetString.slice(-2);

      const utcOffsetInMinutes =
        (offsetSign === "-" ? -1 : 1) *
        (60 * (offsetHour !== "" ? parseInt(offsetHour) : 0) +
          (offsetMinute !== "" ? parseInt(offsetMinute) : 0));

      const date = dayjs(dateString.substr(0, 10)).utcOffset(utcOffsetInMinutes, true);
      return date.isValid() ? date : null;
    }
    return null;
  }, [router.query.date]);

  if (selectedDate) {
    // Let iframe take the width available due to increase in max-width
    sdkActionManager?.fire("__refreshWidth", {});
  }
  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState(detectBrowserTimeFormat);
  const [recurringEventCount, setRecurringEventCount] = useState(eventType.recurringEvent?.count);

  const telemetry = useTelemetry();

  useEffect(() => {
    handleToggle24hClock(localStorage.getItem("timeOption.is24hClock") === "true");

    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(
        telemetryEventTypes.embedView,
        collectPageParameters("/availability", { isTeamBooking: document.URL.includes("team/") })
      );
    }
  }, [telemetry]);

  const changeDate = useCallback(
    (newDate: Dayjs) => {
      router.replace(
        {
          query: {
            ...router.query,
            date: newDate.tz(timeZone(), true).format("YYYY-MM-DDZZ"),
          },
        },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  useEffect(() => {
    if (
      selectedDate != null &&
      selectedDate?.utcOffset() !== selectedDate.clone().utcOffset(0).tz(timeZone()).utcOffset()
    ) {
      changeDate(selectedDate.tz(timeZone(), true));
    }
  }, [selectedDate, changeDate]);

  const handleSelectTimeZone = (selectedTimeZone: string): void => {
    timeZone(selectedTimeZone);
    if (selectedDate) {
      changeDate(selectedDate.tz(selectedTimeZone, true));
    }
    setIsTimeOptionsOpen(false);
  };

  const handleToggle24hClock = (is24hClock: boolean) => {
    setTimeFormat(is24hClock ? "HH:mm" : "h:mma");
  };

  // Recurring event sidebar requires more space
  const maxWidth = selectedDate
    ? recurringEventCount
      ? "max-w-6xl"
      : "max-w-5xl"
    : recurringEventCount
    ? "max-w-4xl"
    : "max-w-3xl";

  return (
    <>
      <Theme />
      <HeadSeo
        title={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title} | ${profile.name}`}
        description={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title}`}
        name={profile.name || undefined}
        username={profile.slug || undefined}
        // avatar={profile.image || undefined}
      />
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />
      <div>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed
              ? classNames(maxWidth)
              : classNames("transition-max-width mx-auto my-0 duration-500 ease-in-out md:my-24", maxWidth)
          )}>
          {isReady && (
            <div
              style={availabilityDatePickerEmbedStyles}
              className={classNames(
                isBackgroundTransparent ? "" : "bg-white dark:bg-gray-800 sm:dark:border-gray-600",
                "border-bookinglightest rounded-md md:border",
                isEmbed ? "mx-auto" : maxWidth
              )}>
              {/* mobile: details */}
              <div className="block p-4 sm:p-8 md:hidden">
                <div>
                  <AvatarGroup
                    border="border-2 dark:border-gray-800 border-white"
                    items={
                      [
                        { image: profile.image, alt: profile.name, title: profile.name },
                        ...eventType.users
                          .filter((user) => user.name !== profile.name)
                          .map((user) => ({
                            title: user.name,
                            image: `${CAL_URL}/${user.username}/avatar.png`,
                            alt: user.name || undefined,
                          })),
                      ].filter((item) => !!item.image) as { image: string; alt?: string; title?: string }[]
                    }
                    size={9}
                    truncateAfter={5}
                  />
                  <div className="mt-4">
                    <p className="break-words text-sm font-medium text-black dark:text-white">
                      {profile.name}
                    </p>
                    <div className="mt-2 gap-2 dark:text-gray-100">
                      <h1 className="text-bookingdark mb-4 break-words text-xl font-semibold dark:text-white">
                        {eventType.title}
                      </h1>
                      <div className="flex flex-col space-y-4">
                        {eventType?.description && (
                          <p className="text-gray-600 dark:text-white">
                            <InformationCircleIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
                            {eventType.description}
                          </p>
                        )}
                        {eventType.locations.length === 1 && (
                          <p className="text-gray-600 dark:text-white">
                            <LocationMarkerIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                            {locationKeyToString(eventType.locations[0], t)}
                          </p>
                        )}
                        {eventType.locations.length === 1 && (
                          <p className="text-gray-600 dark:text-white">
                            {Object.values(AppStoreLocationType).includes(
                              eventType.locations[0].type as unknown as AppStoreLocationType
                            ) ? (
                              <VideoCameraIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                            ) : (
                              <LocationMarkerIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                            )}

                            {locationKeyToString(eventType.locations[0], t)}
                          </p>
                        )}
                        <p className="text-gray-600 dark:text-white">
                          <ClockIcon className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4" />
                          {eventType.length} {t("minutes")}
                        </p>
                        {eventType.price > 0 && (
                          <div className="text-gray-600 dark:text-white">
                            <CreditCardIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 dark:text-gray-400" />
                            <IntlProvider locale="en">
                              <FormattedNumber
                                value={eventType.price / 100.0}
                                style="currency"
                                currency={eventType.currency.toUpperCase()}
                              />
                            </IntlProvider>
                          </div>
                        )}
                        <div className="md:hidden">
                          {booking?.startTime && rescheduleUid && (
                            <div>
                              <p
                                className="mt-8 text-gray-600 dark:text-white"
                                data-testid="former_time_p_mobile">
                                {t("former_time")}
                              </p>
                              <p className="text-gray-500 line-through dark:text-white">
                                <CalendarIcon className="mr-[10px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                                {typeof booking.startTime === "string" &&
                                  parseDate(dayjs(booking.startTime), i18n)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:flex sm:p-4 sm:py-5">
                <div
                  className={
                    "hidden overflow-hidden pr-8 sm:border-r sm:dark:border-gray-700 md:flex md:flex-col " +
                    (selectedDate ? "sm:w-1/3" : recurringEventCount ? "sm:w-2/3" : "sm:w-1/2")
                  }>
                  <AvatarGroup
                    border="border-2 dark:border-gray-800 border-white"
                    items={
                      [
                        { image: profile.image, alt: profile.name, title: profile.name },
                        ...eventType.users
                          .filter((user) => user.name !== profile.name)
                          .map((user) => ({
                            title: user.name,
                            alt: user.name,
                            image: `${CAL_URL}/${user.username}/avatar.png`,
                          })),
                      ].filter((item) => !!item.image) as { image: string; alt?: string; title?: string }[]
                    }
                    size={10}
                    truncateAfter={3}
                  />
                  <h2 className="mt-3 break-words font-medium text-gray-500 dark:text-gray-300">
                    {profile.name}
                  </h2>
                  <h1 className="font-cal mb-4 break-words text-xl font-semibold text-gray-900 dark:text-white">
                    {eventType.title}
                  </h1>
                  <div className="flex flex-col space-y-4">
                    {eventType?.description && (
                      <div className="flex text-gray-600 dark:text-white">
                        <div>
                          <InformationCircleIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                        </div>
                        <p>{eventType.description}</p>
                      </div>
                    )}
                    {eventType.locations.length === 1 && (
                      <p className="text-gray-600  dark:text-white">
                        {Object.values(AppStoreLocationType).includes(
                          eventType.locations[0].type as unknown as AppStoreLocationType
                        ) ? (
                          <VideoCameraIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                        ) : (
                          <LocationMarkerIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                        )}

                        {locationKeyToString(eventType.locations[0], t)}
                      </p>
                    )}
                    {eventType.locations.length > 1 && (
                      <div className="flex-warp flex  text-gray-600 dark:text-white">
                        <div className="mr-[10px] ml-[2px] -mt-1 ">
                          <LocationMarkerIcon className="inline-block h-4 w-4 text-gray-400" />
                        </div>
                        <p>
                          {eventType.locations.map((el, i, arr) => {
                            return (
                              <span key={el.type}>
                                {locationKeyToString(el, t)}{" "}
                                {arr.length - 1 !== i && (
                                  <span className="font-light"> {t("or_lowercase")} </span>
                                )}
                              </span>
                            );
                          })}
                        </p>
                      </div>
                    )}
                    <p className="text-gray-600 dark:text-white">
                      <ClockIcon className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                      {eventType.length} {t("minutes")}
                    </p>
                    {!rescheduleUid && eventType.recurringEvent?.count && eventType.recurringEvent?.freq && (
                      <div className="text-gray-600 dark:text-white">
                        <RefreshIcon className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                        <p className="mb-1 -ml-2 inline px-2 py-1">
                          {t("every_for_freq", {
                            freq: t(
                              `${RRuleFrequency[eventType.recurringEvent.freq].toString().toLowerCase()}`
                            ),
                          })}
                        </p>
                        <input
                          type="number"
                          min="1"
                          max={eventType.recurringEvent.count}
                          className="w-15 h-7 rounded-sm border-gray-300 bg-white text-gray-600 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 dark:border-gray-500 dark:bg-gray-600 dark:text-white sm:text-sm"
                          defaultValue={eventType.recurringEvent.count}
                          onChange={(event) => {
                            setRecurringEventCount(parseInt(event?.target.value));
                          }}
                        />
                        <p className="inline text-gray-600 dark:text-white">
                          {t(`${RRuleFrequency[eventType.recurringEvent.freq].toString().toLowerCase()}`, {
                            count: recurringEventCount,
                          })}
                        </p>
                      </div>
                    )}
                    {eventType.price > 0 && (
                      <p className="-ml-2 px-2 py-1 text-gray-600 dark:text-white">
                        <CreditCardIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                        <IntlProvider locale="en">
                          <FormattedNumber
                            value={eventType.price / 100.0}
                            style="currency"
                            currency={eventType.currency.toUpperCase()}
                          />
                        </IntlProvider>
                      </p>
                    )}
                    <TimezoneDropdown />
                  </div>

                  {previousPage === `${WEBAPP_URL}/${profile.slug}` && (
                    <div className="flex h-full flex-col justify-end">
                      <ArrowLeftIcon
                        className="h-4 w-4 text-black transition-opacity hover:cursor-pointer dark:text-white"
                        onClick={() => router.back()}
                      />
                      <p className="sr-only">Go Back</p>
                    </div>
                  )}
                  {booking?.startTime && rescheduleUid && (
                    <div>
                      <p
                        className="mt-4 mb-3 text-gray-600 dark:text-white"
                        data-testid="former_time_p_desktop">
                        {t("former_time")}
                      </p>
                      <p className="text-gray-500 line-through dark:text-white">
                        <CalendarIcon className="mr-[10px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                        {typeof booking.startTime === "string" && parseDate(dayjs(booking.startTime), i18n)}
                      </p>
                    </div>
                  )}
                </div>

                <DatePicker
                  date={selectedDate}
                  periodType={eventType?.periodType}
                  periodStartDate={eventType?.periodStartDate}
                  periodEndDate={eventType?.periodEndDate}
                  periodDays={eventType?.periodDays}
                  periodCountCalendarDays={eventType?.periodCountCalendarDays}
                  onDatePicked={changeDate}
                  workingHours={workingHours}
                  weekStart={profile.weekStart || "Sunday"}
                  eventLength={eventType.length}
                  minimumBookingNotice={eventType.minimumBookingNotice}
                />

                <div className="mt-4 ml-1 block sm:hidden">
                  <TimezoneDropdown />
                </div>

                {selectedDate && (
                  <AvailableTimes
                    timeFormat={timeFormat}
                    minimumBookingNotice={eventType.minimumBookingNotice}
                    eventTypeId={eventType.id}
                    eventTypeSlug={eventType.slug}
                    slotInterval={eventType.slotInterval}
                    eventLength={eventType.length}
                    recurringCount={recurringEventCount}
                    date={selectedDate}
                    users={eventType.users}
                    schedulingType={eventType.schedulingType ?? null}
                    beforeBufferTime={eventType.beforeEventBuffer}
                    afterBufferTime={eventType.afterEventBuffer}
                    seatsPerTimeSlot={eventType.seatsPerTimeSlot}
                  />
                )}
              </div>
            </div>
          )}
          {(!eventType.users[0] || !isBrandingHidden(eventType.users[0])) && !isEmbed && <PoweredByCal />}
        </main>
      </div>
    </>
  );

  function TimezoneDropdown() {
    return (
      <Collapsible.Root open={isTimeOptionsOpen} onOpenChange={setIsTimeOptionsOpen}>
        <Collapsible.Trigger className="min-w-32 text-bookinglight mb-1 -ml-2 px-2 py-1 text-left dark:text-white">
          <GlobeIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
          {timeZone()}
          {isTimeOptionsOpen ? (
            <ChevronUpIcon className="ml-1 -mt-1 inline-block h-4 w-4" />
          ) : (
            <ChevronDownIcon className="ml-1 -mt-1 inline-block h-4 w-4" />
          )}
        </Collapsible.Trigger>
        <Collapsible.Content>
          <TimeOptions onSelectTimeZone={handleSelectTimeZone} onToggle24hClock={handleToggle24hClock} />
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }
};

export default AvailabilityPage;
