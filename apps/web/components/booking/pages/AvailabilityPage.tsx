// Get router variables
import { EventType } from "@prisma/client";
import { SchedulingType } from "@prisma/client";
import * as Collapsible from "@radix-ui/react-collapsible";
import { TFunction } from "next-i18next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";
import { z } from "zod";

import dayjs, { Dayjs } from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { useContracts } from "@calcom/features/ee/web3/contexts/contractsContext";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import notEmpty from "@calcom/lib/notEmpty";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { detectBrowserTimeFormat } from "@calcom/lib/timeFormat";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import DatePicker from "@calcom/ui/v2/modules/booker/DatePicker";

import { timeZone as localStorageTimeZone } from "@lib/clock";
// import { timeZone } from "@lib/clock";
import { useExposePlanGlobally } from "@lib/hooks/useExposePlanGlobally";
import { isBrandingHidden } from "@lib/isBrandingHidden";

import AvailableTimes from "@components/booking/AvailableTimes";
import TimeOptions from "@components/booking/TimeOptions";
import { UserAvatars } from "@components/booking/UserAvatars";
import EventTypeDescriptionSafeHTML from "@components/eventtype/EventTypeDescriptionSafeHTML";
import { HeadSeo } from "@components/seo/head-seo";
import PoweredByCal from "@components/ui/PoweredByCal";

import type { AvailabilityPageProps } from "../../../pages/[user]/[type]";
import type { DynamicAvailabilityPageProps } from "../../../pages/d/[link]/[slug]";
import type { AvailabilityTeamPageProps } from "../../../pages/team/[slug]/[type]";
import { AvailableEventLocations } from "../AvailableEventLocations";

export type Props = AvailabilityTeamPageProps | AvailabilityPageProps | DynamicAvailabilityPageProps;

const GoBackToPreviousPage = ({ t }: { t: TFunction }) => {
  const router = useRouter();
  const path = router.asPath.split("/");
  path.pop(); // Remove the last item (where we currently are)
  path.shift(); // Removes first item e.g. if we were visitng "/teams/test/30mins" the array will new look like ["teams","test"]
  const slug = path.join("/");
  return (
    <div className="flex h-full flex-col justify-end">
      <button title={t("profile")} onClick={() => router.replace(`${WEBSITE_URL}/${slug}`)}>
        <Icon.FiArrowLeft className="dark:text-darkgray-600 h-4 w-4 text-black transition-opacity hover:cursor-pointer" />
        <p className="sr-only">Go Back</p>
      </button>
    </div>
  );
};

const useSlots = ({
  eventTypeId,
  eventTypeSlug,
  startTime,
  endTime,
  usernameList,
  timeZone,
}: {
  eventTypeId: number;
  eventTypeSlug: string;
  startTime?: Dayjs;
  endTime?: Dayjs;
  usernameList: string[];
  timeZone?: string;
}) => {
  const { data, isLoading, isIdle } = trpc.useQuery(
    [
      "viewer.public.slots.getSchedule",
      {
        eventTypeId,
        eventTypeSlug,
        usernameList,
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
  users,
  seatsPerTimeSlot,
  weekStart = 0,
}: {
  eventType: Pick<EventType, "id" | "schedulingType" | "slug">;
  timeFormat: string;
  timeZone?: string;
  seatsPerTimeSlot?: number;
  recurringEventCount?: number;
  users: string[];
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
      setBrowsingDate(dayjs.utc(month).set("date", 1).set("hour", 0).set("minute", 0).set("second", 0));
      if (date) {
        setSelectedDate(dayjs.utc(date));
      }
    } else {
      // Set the start of the month without shifting time like startOf() may do.
      setBrowsingDate(
        dayjs.tz(month, timeZone).set("date", 1).set("hour", 0).set("minute", 0).set("second", 0)
      );
      if (date) {
        // It's important to set the date immediately to the timeZone, dayjs(date) will convert to browsertime.
        setSelectedDate(dayjs.tz(date, timeZone));
      }
    }
  }, [router.isReady, month, date, timeZone]);

  const { i18n, isLocaleReady } = useLocale();
  const { slots: _1 } = useSlots({
    eventTypeId: eventType.id,
    eventTypeSlug: eventType.slug,
    usernameList: users,
    startTime: selectedDate?.startOf("day"),
    endTime: selectedDate?.endOf("day"),
    timeZone,
  });
  const { slots: _2, isLoading } = useSlots({
    eventTypeId: eventType.id,
    eventTypeSlug: eventType.slug,
    usernameList: users,
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
          "mt-8 w-full px-4 sm:mt-0 sm:min-w-[455px] md:px-5",
          selectedDate
            ? "sm:dark:border-darkgray-200 border-gray-200 sm:w-1/2 sm:border-r sm:p-4 sm:pr-6 md:w-1/3 "
            : "sm:p-4"
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
        />
      )}
    </>
  );
};

function TimezoneDropdown({
  onChangeTimeFormat,
  onChangeTimeZone,
  timeZone,
  timeFormat,
}: {
  onChangeTimeFormat: (newTimeFormat: string) => void;
  onChangeTimeZone: (newTimeZone: string) => void;
  timeZone?: string;
  timeFormat: string;
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
    <Collapsible.Root open={isTimeOptionsOpen} onOpenChange={setIsTimeOptionsOpen} className="flex">
      <Collapsible.Trigger className="min-w-32 mb-2 -ml-2 px-2 text-left text-gray-600 dark:text-white">
        <p className="text-sm font-medium">
          <Icon.FiGlobe className="mr-[10px] ml-[2px] -mt-[2px] inline-block h-4 w-4" />
          {timeZone}
          {isTimeOptionsOpen ? (
            <Icon.FiChevronUp className="ml-1 inline-block h-4 w-4 " />
          ) : (
            <Icon.FiChevronDown className="ml-1 inline-block h-4 w-4 " />
          )}
        </p>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <TimeOptions
          onSelectTimeZone={handleSelectTimeZone}
          onToggle24hClock={handleToggle24hClock}
          timeFormat={timeFormat}
        />
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
  const existingQueryParams = router.asPath.split("?")[1];

  const urlParams = new URLSearchParams(existingQueryParams);
  const query = Object.fromEntries(urlParams);

  const setQuery = (newValue: string | number | null | undefined) => {
    router.replace({ query: { ...router.query, [name]: newValue } }, undefined, { shallow: true });
    router.replace({ query: { ...router.query, ...query, [name]: newValue } }, undefined, { shallow: true });
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
  useTheme(profile.theme);
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

  // get dynamic user list here
  const userList = eventType.users.map((user) => user.username).filter(notEmpty);
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
        timeFormat={timeFormat}
        onChangeTimeFormat={setTimeFormat}
        timeZone={timeZone}
        onChangeTimeZone={setTimeZone}
      />
    ),
    [timeZone, timeFormat]
  );
  const rawSlug = profile.slug ? profile.slug.split("/") : [];
  if (rawSlug.length > 1) rawSlug.pop(); //team events have team name as slug, but user events have [user]/[type] as slug.
  const slug = rawSlug.join("/");

  return (
    <>
      <HeadSeo
        title={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title} | ${profile.name}`}
        description={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title}`}
        name={profile.name || undefined}
        username={slug || undefined}
        nextSeoProps={{
          nofollow: eventType.hidden,
          noindex: eventType.hidden,
        }}
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
              isBackgroundTransparent ? "" : "dark:bg-darkgray-100 sm:dark:border-darkgray-300 bg-white",
              "border-bookinglightest rounded-md md:border",
              isEmbed ? "mx-auto" : maxWidth
            )}>
            {/* mobile: details */}
            <div className="block px-4 pt-4 sm:p-8 md:hidden">
              <div>
                <UserAvatars
                  profile={profile}
                  users={eventType.users}
                  showMembers={eventType.schedulingType !== SchedulingType.ROUND_ROBIN}
                  size={9}
                  truncateAfter={5}
                />
                <div className="mt-4">
                  <div className="dark:text-darkgray-900 mt-2 gap-2">
                    <p className="break-words text-sm font-medium text-gray-600 dark:text-gray-300">
                      {profile.name}
                    </p>
                    <h1 className="text-bookingdark dark:text-darkgray-900 mb-4 break-words text-xl font-semibold">
                      {eventType.title}
                    </h1>
                    <div className="flex flex-col space-y-3">
                      {eventType?.description && (
                        <div className="flex py-1 text-sm font-medium text-gray-600 dark:text-white">
                          <div>
                            <Icon.FiInfo className="mr-[10px] ml-[2px] inline-block h-4 w-4" />
                          </div>
                          <EventTypeDescriptionSafeHTML eventType={eventType} />
                        </div>
                      )}
                      {eventType?.requiresConfirmation && (
                        <p className="dark:text-darkgray-600 text-gray-600 dark:text-white">
                          <Icon.FiCheckSquare className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
                          {t("requires_confirmation")}
                        </p>
                      )}
                      <AvailableEventLocations locations={eventType.locations} />
                      <p className="text-gray-600 dark:text-white">
                        <Icon.FiClock className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4" />
                        {eventType.length} {t("minutes")}
                      </p>
                      {eventType.price > 0 && (
                        <div className="text-gray-600 dark:text-white">
                          <Icon.FiCreditCard className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
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
                        <div className="dark:text-darkgray-600 flex items-center text-gray-600">
                          <Icon.FiRefreshCcw className="float-left mr-[10px] mt-1 ml-[2px] inline-block h-4 w-4 shrink-0 text-gray-500" />
                          <div>
                            <p className="mb-1 -ml-2 inline px-2 py-1">
                              {getRecurringFreq({ t, recurringEvent: eventType.recurringEvent })}
                            </p>
                            <input
                              type="number"
                              min="1"
                              max={eventType.recurringEvent.count}
                              className="w-15 dark:text-darkgray-600 h-7 rounded-sm border-gray-300 bg-white text-sm text-gray-600 [appearance:textfield] ltr:mr-2 rtl:ml-2 dark:border-gray-500 dark:bg-gray-600"
                              defaultValue={eventType.recurringEvent.count}
                              onChange={(event) => {
                                setRecurringEventCount(parseInt(event?.target.value));
                              }}
                            />
                            <p className="dark:text-darkgray-600 inline text-gray-600 ">
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
                                className="mt-8 text-gray-600 dark:text-darkgray-600"
                                data-testid="former_time_p_mobile">
                                {t("former_time")}
                              </p>
                              <p className="text-gray-500 line-through dark:text-darkgray-600">
                                <CalendarIcon className="mr-[10px] -mt-1 inline-block h-4 w-4 text-gray-500" />
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

            <div className="overflow-hidden sm:flex">
              <div
                className={
                  "sm:dark:border-darkgray-200 hidden overflow-hidden border-gray-200 p-5 sm:border-r md:flex md:flex-col " +
                  (isAvailableTimesVisible ? "sm:w-1/3" : recurringEventCount ? "sm:w-2/3" : "sm:w-1/2")
                }>
                <UserAvatars
                  profile={profile}
                  users={eventType.users}
                  showMembers={eventType.schedulingType !== SchedulingType.ROUND_ROBIN}
                  size={10}
                  truncateAfter={3}
                />
                <h2 className="break-words text-sm font-medium text-gray-600 dark:text-gray-300 lg:mt-2">
                  {profile.name}
                </h2>
                <h1 className="font-cal dark:text-darkgray-900 mb-6 break-words text-2xl text-gray-900 ">
                  {eventType.title}
                </h1>
                <div className="flex flex-col space-y-3 text-sm font-medium text-gray-600 dark:text-white">
                  {eventType?.description && (
                    <div className="flex ">
                      <div>
                        <Icon.FiInfo className="mr-[10px] ml-[2px] inline-block h-4 w-4" />
                      </div>
                      <EventTypeDescriptionSafeHTML eventType={eventType} />
                    </div>
                  )}
                  {eventType?.requiresConfirmation && (
                    <div className="flex items-center">
                      <div>
                        <Icon.FiCheckSquare className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 " />
                      </div>
                      {t("requires_confirmation")}
                    </div>
                  )}
                  <AvailableEventLocations locations={eventType.locations} />
                  <p className="text-sm font-medium">
                    <Icon.FiClock className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4" />
                    {eventType.length} {t("minutes")}
                  </p>
                  {!rescheduleUid && eventType.recurringEvent && (
                    <div className="flex items-start text-sm font-medium">
                      <Icon.FiRefreshCcw className="float-left mr-[10px] mt-[7px] ml-[2px] inline-block h-4 w-4 " />
                      <div>
                        <p className="mb-1 -ml-2 inline px-2 py-1">
                          {getRecurringFreq({ t, recurringEvent: eventType.recurringEvent })}
                        </p>
                        <input
                          type="number"
                          min="1"
                          max={eventType.recurringEvent.count}
                          className="w-15 dark:bg-darkgray-200 h-7 rounded-sm border-gray-300 bg-white text-sm font-medium [appearance:textfield] ltr:mr-2 rtl:ml-2 dark:border-gray-500"
                          defaultValue={eventType.recurringEvent.count}
                          onChange={(event) => {
                            setRecurringEventCount(parseInt(event?.target.value));
                          }}
                        />
                        <p className="inline">
                          {t("occurrence", {
                            count: recurringEventCount,
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {eventType.price > 0 && (
                    <p className="-ml-2 px-2 text-sm font-medium ">
                      <Icon.FiCreditCard className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
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
                        className="mt-4 mb-3 text-gray-600 dark:text-darkgray-600"
                        data-testid="former_time_p_desktop">
                        {t("former_time")}
                      </p>
                      <p className="text-gray-500 line-through dark:text-darkgray-600">
                        <CalendarIcon className="mr-[10px] -mt-1 inline-block h-4 w-4 text-gray-500" />
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
                users={userList}
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
