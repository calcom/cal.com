// Get router variables
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardCheckIcon,
  ClockIcon,
  CreditCardIcon,
  GlobeIcon,
  InformationCircleIcon,
  LocationMarkerIcon,
  RefreshIcon,
  VideoCameraIcon,
} from "@heroicons/react/solid";
import { EventType } from "@prisma/client";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useContracts } from "contexts/contractsContext";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import { TFunction } from "next-i18next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { AppStoreLocationType, LocationObject, LocationType } from "@calcom/app-store/locations";
import {
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import classNames from "@calcom/lib/classNames";
import { CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { yyyymmdd } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { localStorage } from "@calcom/lib/webstorage";
import DatePicker, { Day } from "@calcom/ui/booker/DatePicker";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { useExposePlanGlobally } from "@lib/hooks/useExposePlanGlobally";
import useTheme from "@lib/hooks/useTheme";
import { isBrandingHidden } from "@lib/isBrandingHidden";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { detectBrowserTimeFormat } from "@lib/timeFormat";
import { trpc } from "@lib/trpc";

import CustomBranding from "@components/CustomBranding";
import AvailableTimes from "@components/booking/AvailableTimes";
import TimeOptions from "@components/booking/TimeOptions";
import { HeadSeo } from "@components/seo/head-seo";
import AvatarGroup from "@components/ui/AvatarGroup";
import PoweredByCal from "@components/ui/PoweredByCal";

import type { AvailabilityPageProps } from "../../../pages/[user]/[type]";
import type { DynamicAvailabilityPageProps } from "../../../pages/d/[link]/[slug]";
import type { AvailabilityTeamPageProps } from "../../../pages/team/[slug]/[type]";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

type Props = AvailabilityTeamPageProps | AvailabilityPageProps | DynamicAvailabilityPageProps;

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

const GoBackToPreviousPage = ({ slug }: { slug: string }) => {
  const router = useRouter();
  const [previousPage, setPreviousPage] = useState<string>();
  useEffect(() => {
    setPreviousPage(document.referrer);
  }, []);

  return previousPage === `${WEBAPP_URL}/${slug}` ? (
    <div className="flex h-full flex-col justify-end">
      <ArrowLeftIcon
        className="h-4 w-4 text-black transition-opacity hover:cursor-pointer dark:text-white"
        onClick={() => router.back()}
      />
      <p className="sr-only">Go Back</p>
    </div>
  ) : (
    <></>
  );
};

const useSlots = ({
  eventTypeId,
  startTime,
  endTime,
}: {
  eventTypeId: number;
  startTime: Date;
  endTime: Date;
}) => {
  const { data, isLoading } = trpc.useQuery(
    [
      "viewer.public.slots.getSchedule",
      {
        eventTypeId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    ],
    /** Prevents fetching past dates */
    { enabled: dayjs(startTime).isAfter(dayjs().subtract(1, "day")) }
  );

  return { slots: data?.slots || {}, isLoading };
};

const SlotPicker = ({
  eventType,
  timezoneDropdown,
  timeFormat,
  timeZone,
  recurringEventCount,
  seatsPerTimeSlot,
  weekStart = 0,
}: {
  eventType: Pick<EventType, "id" | "schedulingType" | "slug">;
  timezoneDropdown: JSX.Element;
  timeFormat: string;
  timeZone?: string;
  seatsPerTimeSlot?: number;
  recurringEventCount?: number;
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}) => {
  const { selectedDate, setSelectedDate } = useDateSelected({ timeZone });

  const { i18n, isLocaleReady } = useLocale();
  const [startDate, setStartDate] = useState(new Date());

  useEffect(() => {
    if (dayjs(selectedDate).startOf("month").isAfter(dayjs())) {
      setStartDate(dayjs(selectedDate).startOf("month").toDate());
    }
  }, [selectedDate]);

  const { slots, isLoading } = useSlots({
    eventTypeId: eventType.id,
    startTime: dayjs(startDate).startOf("day").toDate(),
    endTime: dayjs(startDate).endOf("month").toDate(),
  });

  return (
    <>
      <DatePicker
        isLoading={isLoading}
        className={
          "mt-8 w-full sm:mt-0 sm:min-w-[455px] " +
          (selectedDate
            ? "sm:w-1/2 sm:border-r sm:pl-4 sm:pr-6 sm:dark:border-gray-700 md:w-1/3 "
            : "sm:pl-4")
        }
        includedDates={Object.keys(slots).filter((k) => slots[k].length > 0)}
        locale={isLocaleReady ? i18n.language : "en"}
        selected={selectedDate}
        onChange={setSelectedDate}
        onMonthChange={(startDate) => {
          // set the minimum day to today in the current month, not the beginning of the month
          setStartDate(
            dayjs(startDate).isBefore(dayjs().subtract(1, "day"))
              ? dayjs(new Date()).startOf("day").toDate()
              : startDate
          );
        }}
        weekStart={weekStart}
        // DayComponent={(props) => <DayContainer {...props} eventTypeId={eventType.id} />}
      />

      <div className="mt-4 ml-1 block sm:hidden">{timezoneDropdown}</div>

      {selectedDate && (
        <AvailableTimes
          slots={slots[yyyymmdd(selectedDate)]}
          date={dayjs(selectedDate)}
          timeFormat={timeFormat}
          eventTypeId={eventType.id}
          eventTypeSlug={eventType.slug}
          seatsPerTimeSlot={seatsPerTimeSlot}
          recurringCount={recurringEventCount}
          schedulingType={eventType.schedulingType}
          users={[]}
        />
      )}
    </>
  );
};

function TimezoneDropdown({
  onChangeTimeFormat,
  onChangeTimeZone,
}: {
  onChangeTimeFormat: (newTimeFormat: string) => void;
  onChangeTimeZone: (newTimeZone: string) => void;
}) {
  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);

  useEffect(() => {
    handleToggle24hClock(localStorage.getItem("timeOption.is24hClock") === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectTimeZone = (newTimeZone: string) => {
    timeZone(newTimeZone);
    onChangeTimeZone(newTimeZone);
    setIsTimeOptionsOpen(false);
  };

  const handleToggle24hClock = (is24hClock: boolean) => {
    onChangeTimeFormat(is24hClock ? "HH:mm" : "h:mma");
  };

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

const useDateSelected = ({ timeZone }: { timeZone?: string }) => {
  const router = useRouter();
  const [selectedDate, _setSelectedDate] = useState<Date>();

  useEffect(() => {
    /** TODO: router.query.date is comming as `null` even when set like this:
     * `/user/type?date=2022-06-22-0600`
     */
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
      console.log("date.isValid()", date.isValid());
      if (date.isValid()) {
        setSelectedDate(date.toDate());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.date]);

  const setSelectedDate = (newDate: Date) => {
    router.replace(
      {
        query: {
          ...router.query,
          date: dayjs(newDate).tz(timeZone, true).format("YYYY-MM-DDZZ"),
        },
      },
      undefined,
      { shallow: true }
    );
    _setSelectedDate(newDate);
  };

  return { selectedDate, setSelectedDate };
};

const AvailabilityPage = ({ profile, eventType }: Props) => {
  const router = useRouter();
  const isEmbed = useIsEmbed();
  const { rescheduleUid } = router.query;
  const { Theme } = useTheme(profile.theme);
  const { t } = useLocale();
  const { contracts } = useContracts();
  const availabilityDatePickerEmbedStyles = useEmbedStyles("availabilityDatePicker");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";

  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const isBackgroundTransparent = useIsBackgroundTransparent();

  const [timeZone, setTimeZone] = useState<string>();
  const [timeFormat, setTimeFormat] = useState(detectBrowserTimeFormat);
  const [isAvailableTimesVisible, setIsAvailableTimesVisible] = useState<boolean>();

  useEffect(() => {
    setIsAvailableTimesVisible(!!router.query.date);
  }, [router.query.date]);

  // TODO: Improve this;
  useExposePlanGlobally(eventType.users.length === 1 ? eventType.users[0].plan : "PRO");

  // TODO: this needs to be extracted elsewhere
  useEffect(() => {
    if (eventType.metadata.smartContractAddress) {
      const eventOwner = eventType.users[0];
      if (!contracts[(eventType.metadata.smartContractAddress || null) as number])
        router.replace(`/${eventOwner.username}`);
    }
  }, [contracts, eventType.metadata.smartContractAddress, eventType.users, router]);

  const [recurringEventCount, setRecurringEventCount] = useState(eventType.recurringEvent?.count);

  const telemetry = useTelemetry();
  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(
        telemetryEventTypes.embedView,
        collectPageParameters("/availability", { isTeamBooking: document.URL.includes("team/") })
      );
    }
  }, [telemetry]);

  // Avoid embed styling flicker. Till embed status is confirmed, don't render.
  if (isEmbed === null) {
    return null;
  }
  // Recurring event sidebar requires more space
  const maxWidth = isAvailableTimesVisible
    ? recurringEventCount
      ? "max-w-6xl"
      : "max-w-5xl"
    : recurringEventCount
    ? "max-w-4xl"
    : "max-w-3xl";

  const timezoneDropdown = (
    <TimezoneDropdown onChangeTimeFormat={setTimeFormat} onChangeTimeZone={setTimeZone} />
  );

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
          <div
            style={availabilityDatePickerEmbedStyles}
            className={classNames(
              isBackgroundTransparent ? "" : "bg-white dark:bg-gray-800 sm:dark:border-gray-600",
              "border-bookinglightest rounded-md md:border",
              isEmbed ? "mx-auto" : maxWidth
            )}>
            {/* mobile: details */}
            <div className="block px-4 pt-4 sm:p-8 md:hidden">
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
                  <p className="break-words text-sm font-medium text-black dark:text-white">{profile.name}</p>
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
                      {eventType?.requiresConfirmation && (
                        <p className="text-gray-600 dark:text-white">
                          <ClipboardCheckIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
                          {t("requires_confirmation")}
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
                      {eventType.locations.length > 1 && (
                        <div className="flex-warp flex text-gray-600 dark:text-white">
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
                      {!rescheduleUid && eventType.recurringEvent && (
                        <div className="text-gray-600 dark:text-white">
                          <RefreshIcon className="float-left mr-[10px] mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                          <div className="ml-[27px]">
                            <p className="mb-1 -ml-2 inline px-2 py-1">
                              {getRecurringFreq({ t, recurringEvent: eventType.recurringEvent })}
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
                              {t("occurrence", {
                                count: recurringEventCount,
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                      {timezoneDropdown}

                      <div className="md:hidden">
                        {/* Temp disabled booking?.startTime && rescheduleUid && (
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
                          )*/}
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
                  (isAvailableTimesVisible ? "sm:w-1/3" : recurringEventCount ? "sm:w-2/3" : "sm:w-1/2")
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
                  {eventType?.requiresConfirmation && (
                    <div className="flex text-gray-600 dark:text-white">
                      <div>
                        <ClipboardCheckIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                      </div>
                      {t("requires_confirmation")}
                    </div>
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
                  {eventType.locations.length > 1 && (
                    <div className="flex-warp flex text-gray-600 dark:text-white">
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
                  {!rescheduleUid && eventType.recurringEvent && (
                    <div className="text-gray-600 dark:text-white">
                      <RefreshIcon className="float-left mr-[10px] mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                      <div className="ml-[27px]">
                        <p className="mb-1 -ml-2 inline px-2 py-1">
                          {getRecurringFreq({ t, recurringEvent: eventType.recurringEvent })}
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
                          {t("occurrence", {
                            count: recurringEventCount,
                          })}
                        </p>
                      </div>
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
                  {timezoneDropdown}
                </div>

                <GoBackToPreviousPage slug={profile.slug || ""} />

                {/* Temporarily disabled - booking?.startTime && rescheduleUid && (
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
                  )*/}
              </div>
              <SlotPicker
                weekStart={
                  typeof profile.weekStart === "string"
                    ? (["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(
                        profile.weekStart
                      ) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
                    : profile.weekStart /* Allows providing weekStart as number */
                }
                eventType={eventType}
                timezoneDropdown={timezoneDropdown}
                timeZone={timeZone}
                timeFormat={timeFormat}
                seatsPerTimeSlot={eventType.seatsPerTimeSlot || undefined}
                recurringEventCount={recurringEventCount}
              />
            </div>
          </div>
          {(!eventType.users[0] || !isBrandingHidden(eventType.users[0])) && !isEmbed && <PoweredByCal />}
        </main>
      </div>
    </>
  );
};

const DayContainer = (props: React.ComponentProps<typeof Day> & { eventTypeId: number }) => {
  const { eventTypeId, ...rest } = props;
  /** :
   * Fetch each individual day here. All these are batched with tRPC anyways.
   **/
  const { slots } = useSlots({
    eventTypeId,
    startTime: dayjs(props.date).startOf("day").toDate(),
    endTime: dayjs(props.date).endOf("day").toDate(),
  });
  const includedDates = Object.keys(slots).filter((k) => slots[k].length > 0);
  const disabled = includedDates.length > 0 ? !includedDates.includes(yyyymmdd(props.date)) : props.disabled;
  return <Day {...{ ...rest, disabled }} />;
};

const AvailableTimesContainer = (props: React.ComponentProps<typeof AvailableTimes>) => {
  const { date, eventTypeId } = props;
  const { slots } = useSlots({
    eventTypeId,
    startTime: dayjs(date).startOf("day").toDate(),
    endTime: dayjs(date).endOf("day").toDate(),
  });
  return <AvailableTimes {...props} slots={slots[date.format("YYYY-MM-DD")]} />;
};

export default AvailabilityPage;
