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
import { TFunction } from "next-i18next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";
import { z } from "zod";

import { AppStoreLocationType, LocationObject, LocationType } from "@calcom/app-store/locations";
import dayjs, { Dayjs } from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import classNames from "@calcom/lib/classNames";
import { CAL_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { localStorage } from "@calcom/lib/webstorage";
import DatePicker from "@calcom/ui/booker/DatePicker";

import { timeZone as localStorageTimeZone } from "@lib/clock";
// import { timeZone } from "@lib/clock";
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

const GoBackToPreviousPage = ({ t }: { t: TFunction }) => {
  const router = useRouter();
  const path = router.asPath.split("/");
  path.pop(); // Remove the last item (where we currently are)
  path.shift(); // Removes first item e.g. if we were visitng "/teams/test/30mins" the array will new look like ["teams","test"]
  const slug = path.join("/");
  return (
    <div className="flex h-full flex-col justify-end">
      <button title={t("profile")} onClick={() => router.replace(`${WEBSITE_URL}/${slug}`)}>
        <ArrowLeftIcon className="h-4 w-4 text-black transition-opacity hover:cursor-pointer dark:text-white" />
        <p className="sr-only">Go Back</p>
      </button>
    </div>
  );
};

const useSlots = ({
  eventTypeId,
  startTime,
  endTime,
  timeZone,
}: {
  eventTypeId: number;
  startTime?: Dayjs;
  endTime?: Dayjs;
  timeZone?: string;
}) => {
  const { data, isLoading, isIdle } = trpc.useQuery(
    [
      "viewer.public.slots.getSchedule",
      {
        eventTypeId,
        startTime: startTime?.toISOString() || "",
        endTime: endTime?.toISOString() || "",
        timeZone,
      },
    ],
    { enabled: !!startTime && !!endTime }
  );

  const [cachedSlots, setCachedSlots] = useState<NonNullable<typeof data>["slots"]>({});

  useEffect(() => {
    if (data?.slots) {
      setCachedSlots((c) => ({ ...c, ...data?.slots }));
    }
  }, [data]);

  // The very first time isIdle is set if auto-fetch is disabled, so isIdle should also be considered a loading state.
  return { slots: cachedSlots, isLoading: isLoading || isIdle };
};

const SlotPicker = ({
  eventType,
  timeFormat,
  timeZone,
  recurringEventCount,
  seatsPerTimeSlot,
  weekStart = 0,
}: {
  eventType: Pick<EventType, "id" | "schedulingType" | "slug">;
  timeFormat: string;
  timeZone?: string;
  seatsPerTimeSlot?: number;
  recurringEventCount?: number;
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>();
  const [browsingDate, setBrowsingDate] = useState<Dayjs>();
  const { date, setQuery: setDate } = useRouterQuery("date");
  const { month, setQuery: setMonth } = useRouterQuery("month");
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    // Etc/GMT is not actually a timeZone, so handle this select option explicitly to prevent a hard crash.
    if (timeZone === "Etc/GMT") {
      setBrowsingDate(dayjs.utc(month).startOf("month"));
      if (date) {
        setSelectedDate(dayjs.utc(date));
      }
    } else {
      setBrowsingDate(dayjs(month).tz(timeZone, true).startOf("month"));
      if (date) {
        setSelectedDate(dayjs(date).tz(timeZone, true));
      }
    }
  }, [router.isReady, month, date, timeZone]);

  const { i18n, isLocaleReady } = useLocale();
  const { slots: _1 } = useSlots({
    eventTypeId: eventType.id,
    startTime: selectedDate?.startOf("day"),
    endTime: selectedDate?.endOf("day"),
    timeZone,
  });
  const { slots: _2, isLoading } = useSlots({
    eventTypeId: eventType.id,
    startTime: browsingDate?.startOf("month"),
    endTime: browsingDate?.endOf("month"),
    timeZone,
  });

  const slots = useMemo(() => ({ ..._1, ..._2 }), [_1, _2]);

  return (
    <>
      <DatePicker
        isLoading={isLoading}
        className={classNames(
          "mt-8 w-full sm:mt-0 sm:min-w-[455px]",
          selectedDate ? "sm:w-1/2 sm:border-r sm:pl-4 sm:pr-6 sm:dark:border-gray-700 md:w-1/3 " : "sm:pl-4"
        )}
        includedDates={Object.keys(slots).filter((k) => slots[k].length > 0)}
        locale={isLocaleReady ? i18n.language : "en"}
        selected={selectedDate}
        onChange={(newDate) => {
          setDate(newDate.format("YYYY-MM-DD"));
        }}
        onMonthChange={(newMonth) => {
          setMonth(newMonth.format("YYYY-MM"));
        }}
        browsingDate={browsingDate}
        weekStart={weekStart}
      />

      {selectedDate && (
        <AvailableTimes
          isLoading={isLoading}
          slots={slots[selectedDate.format("YYYY-MM-DD")]}
          date={selectedDate}
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
  timeZone,
}: {
  onChangeTimeFormat: (newTimeFormat: string) => void;
  onChangeTimeZone: (newTimeZone: string) => void;
  timeZone?: string;
}) {
  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);

  useEffect(() => {
    handleToggle24hClock(localStorage.getItem("timeOption.is24hClock") === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectTimeZone = (newTimeZone: string) => {
    onChangeTimeZone(newTimeZone);
    localStorageTimeZone(newTimeZone);
    setIsTimeOptionsOpen(false);
  };

  const handleToggle24hClock = (is24hClock: boolean) => {
    onChangeTimeFormat(is24hClock ? "HH:mm" : "h:mma");
  };

  return (
    <Collapsible.Root open={isTimeOptionsOpen} onOpenChange={setIsTimeOptionsOpen}>
      <Collapsible.Trigger className="min-w-32 text-bookinglight mb-1 -ml-2 px-2 py-1 text-left dark:text-white">
        <p className="text-gray-600 dark:text-white">
          <GlobeIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
          {timeZone}
          {isTimeOptionsOpen ? (
            <ChevronUpIcon className="ml-1 -mt-1 inline-block h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="ml-1 -mt-1 inline-block h-4 w-4 text-gray-400" />
          )}
        </p>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <TimeOptions onSelectTimeZone={handleSelectTimeZone} onToggle24hClock={handleToggle24hClock} />
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

const dateQuerySchema = z.object({
  rescheduleUid: z.string().optional().default(""),
  date: z.string().optional().default(""),
  timeZone: z.string().optional().default(""),
});

const useRouterQuery = <T extends string>(name: T) => {
  const router = useRouter();
  const query = z.object({ [name]: z.string().optional() }).parse(router.query);

  const setQuery = (newValue: string | number | null | undefined) => {
    router.replace({ query: { ...router.query, [name]: newValue } }, undefined, { shallow: true });
  };

  return { [name]: query[name], setQuery } as {
    [K in T]: string | undefined;
  } & { setQuery: typeof setQuery };
};

const AvailabilityPage = ({ profile, eventType }: Props) => {
  const router = useRouter();
  const isEmbed = useIsEmbed();
  const query = dateQuerySchema.parse(router.query);
  const { rescheduleUid } = query;
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
    setTimeZone(localStorageTimeZone() || dayjs.tz.guess());
  }, []);

  useEffect(() => {
    setIsAvailableTimesVisible(!!query.date);
  }, [query.date]);

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

  // Recurring event sidebar requires more space
  const maxWidth = isAvailableTimesVisible
    ? recurringEventCount
      ? "max-w-6xl"
      : "max-w-5xl"
    : recurringEventCount
    ? "max-w-4xl"
    : "max-w-3xl";
  const timezoneDropdown = useMemo(
    () => (
      <TimezoneDropdown
        onChangeTimeFormat={setTimeFormat}
        timeZone={timeZone}
        onChangeTimeZone={setTimeZone}
      />
    ),
    [timeZone]
  );

  return (
    <>
      <Theme />
      <HeadSeo
        title={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title} | ${profile.name}`}
        description={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title}`}
        name={profile.name || undefined}
        username={profile.slug || undefined}
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

            <div className="p-4 sm:flex sm:py-5">
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

                {!isEmbed && <GoBackToPreviousPage t={t} />}

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
                timeFormat={timeFormat}
                timeZone={timeZone}
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

export default AvailabilityPage;
