// Get router variables
import autoAnimate from "@formkit/auto-animate";
import { EventType } from "@prisma/client";
import * as Popover from "@radix-ui/react-popover";
import { TFunction } from "next-i18next";
import { useRouter } from "next/router";
import { useReducer, useEffect, useMemo, useState, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { FormattedNumber, IntlProvider } from "react-intl";
import { z } from "zod";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import dayjs, { Dayjs } from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import { WEBSITE_URL } from "@calcom/lib/constants";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import notEmpty from "@calcom/lib/notEmpty";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { detectBrowserTimeFormat, getIs24hClockFromLocalStorage } from "@calcom/lib/timeFormat";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import DatePicker from "@calcom/ui/v2/modules/booker/DatePicker";

import { timeZone as localStorageTimeZone } from "@lib/clock";
// import { timeZone } from "@lib/clock";
import { useExposePlanGlobally } from "@lib/hooks/useExposePlanGlobally";
import { isBrandingHidden } from "@lib/isBrandingHidden";

import Gates, { Gate, GateState } from "@components/Gates";
import AvailableTimes from "@components/booking/AvailableTimes";
import BookingDescription from "@components/booking/BookingDescription";
import TimeOptions from "@components/booking/TimeOptions";
import { HeadSeo } from "@components/seo/head-seo";
import PoweredByCal from "@components/ui/PoweredByCal";

import type { AvailabilityPageProps } from "../../../pages/[user]/[type]";
import type { DynamicAvailabilityPageProps } from "../../../pages/d/[link]/[slug]";
import type { AvailabilityTeamPageProps } from "../../../pages/team/[slug]/[type]";

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
  const { data, isLoading, isPaused } = trpc.useQuery(
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

  // The very first time isPaused is set if auto-fetch is disabled, so isPaused should also be considered a loading state.
  return { slots: cachedSlots, isLoading: isLoading || isPaused };
};

const SlotPicker = ({
  eventType,
  timeFormat,
  timeZone,
  recurringEventCount,
  users,
  seatsPerTimeSlot,
  weekStart = 0,
  ethSignature,
}: {
  eventType: Pick<EventType, "id" | "schedulingType" | "slug">;
  timeFormat: string;
  timeZone?: string;
  seatsPerTimeSlot?: number;
  recurringEventCount?: number;
  users: string[];
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  ethSignature?: string;
}) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>();
  const [browsingDate, setBrowsingDate] = useState<Dayjs>();
  const { date, setQuery: setDate } = useRouterQuery("date");
  const { month, setQuery: setMonth } = useRouterQuery("month");
  const router = useRouter();
  const slotPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    slotPickerRef.current && autoAnimate(slotPickerRef.current);
  }, [slotPickerRef]);

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

  const slots = useMemo(() => ({ ..._2, ..._1 }), [_1, _2]);

  return (
    <>
      <DatePicker
        isLoading={isLoading}
        className={classNames(
          "mt-8 px-4 pb-4 sm:mt-0 md:min-w-[300px] md:px-5 lg:min-w-[455px]",
          selectedDate ? "sm:dark:border-darkgray-200 border-gray-200 sm:border-r sm:p-4 sm:pr-6" : "sm:p-4"
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

      <div ref={slotPickerRef}>
        <AvailableTimes
          isLoading={isLoading}
          slots={selectedDate && slots[selectedDate.format("YYYY-MM-DD")]}
          date={selectedDate}
          timeFormat={timeFormat}
          eventTypeId={eventType.id}
          eventTypeSlug={eventType.slug}
          seatsPerTimeSlot={seatsPerTimeSlot}
          recurringCount={recurringEventCount}
          ethSignature={ethSignature}
        />
      </div>
    </>
  );
};

function TimezoneDropdown({
  onChangeTimeFormat,
  onChangeTimeZone,
  timeZone,
  timeFormat,
  hideTimeFormatToggle,
}: {
  onChangeTimeFormat: (newTimeFormat: string) => void;
  onChangeTimeZone: (newTimeZone: string) => void;
  timeZone?: string;
  timeFormat: string;
  hideTimeFormatToggle?: boolean;
}) {
  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);

  useEffect(() => {
    handleToggle24hClock(!!getIs24hClockFromLocalStorage());
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
    <Popover.Root open={isTimeOptionsOpen} onOpenChange={setIsTimeOptionsOpen}>
      <Popover.Trigger className="min-w-32 dark:text-darkgray-600 radix-state-open:bg-gray-200 dark:radix-state-open:bg-darkgray-200 group relative mb-2 -ml-2 inline-block rounded-md px-2 py-2 text-left text-gray-600">
        <p className="text-sm font-medium">
          <Icon.FiGlobe className="mr-[10px] ml-[2px] -mt-[2px] inline-block h-4 w-4" />
          {timeZone}
          {isTimeOptionsOpen ? (
            <Icon.FiChevronUp className="ml-1 inline-block h-4 w-4" />
          ) : (
            <Icon.FiChevronDown className="ml-1 inline-block h-4 w-4" />
          )}
        </p>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          hideWhenDetached
          align="start"
          className="animate-fade-in-up absolute left-0 top-2 w-80 max-w-[calc(100vw_-_1.5rem)]">
          <TimeOptions
            onSelectTimeZone={handleSelectTimeZone}
            onToggle24hClock={handleToggle24hClock}
            timeFormat={timeFormat}
            hideTimeFormatToggle={hideTimeFormatToggle}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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

export type Props = AvailabilityTeamPageProps | AvailabilityPageProps | DynamicAvailabilityPageProps;

const timeFormatTotimeFormatString = (timeFormat?: number | null) => {
  if (!timeFormat) return null;
  return timeFormat === 24 ? "HH:mm" : "h:mma";
};

const AvailabilityPage = ({ profile, eventType, ...restProps }: Props) => {
  const { data: user } = trpc.useQuery(["viewer.me"]);
  const timeFormatFromProfile = timeFormatTotimeFormatString(user?.timeFormat);
  const router = useRouter();
  const isEmbed = useIsEmbed(restProps.isEmbed);
  const query = dateQuerySchema.parse(router.query);
  const { rescheduleUid } = query;
  useTheme(profile.theme);
  const { t } = useLocale();
  const availabilityDatePickerEmbedStyles = useEmbedStyles("availabilityDatePicker");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const isBackgroundTransparent = useIsBackgroundTransparent();

  const [timeZone, setTimeZone] = useState<string>();
  const [timeFormat, setTimeFormat] = useState<string>("HH:mm");

  const [gateState, gateDispatcher] = useReducer(
    (state: GateState, newState: Partial<GateState>) => ({
      ...state,
      ...newState,
    }),
    {}
  );

  useEffect(() => {
    setTimeZone(localStorageTimeZone() || dayjs.tz.guess());
    setTimeFormat(timeFormatFromProfile || detectBrowserTimeFormat);
  }, [timeFormatFromProfile]);

  // TODO: Improve this;
  useExposePlanGlobally(eventType.users.length === 1 ? eventType.users[0].plan : "PRO");

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
  const userList = eventType.users ? eventType.users.map((user) => user.username).filter(notEmpty) : [];

  const timezoneDropdown = useMemo(
    () => (
      <TimezoneDropdown
        timeFormat={timeFormat}
        onChangeTimeFormat={setTimeFormat}
        timeZone={timeZone}
        onChangeTimeZone={setTimeZone}
        // Currently we don't allow the user to change the timeformat when they're logged in,
        // the only way to change it is if they go to their profile.
        hideTimeFormatToggle={!!timeFormatFromProfile}
      />
    ),
    [timeZone, timeFormat, timeFormatFromProfile]
  );
  const stripeAppData = getStripeAppData(eventType);
  const rainbowAppData = getEventTypeAppData(eventType, "rainbow") || {};
  const rawSlug = profile.slug ? profile.slug.split("/") : [];
  if (rawSlug.length > 1) rawSlug.pop(); //team events have team name as slug, but user events have [user]/[type] as slug.

  // Define conditional gates here
  const gates = [
    // Rainbow gate is only added if the event has both a `blockchainId` and a `smartContractAddress`
    rainbowAppData && rainbowAppData.blockchainId && rainbowAppData.smartContractAddress
      ? ("rainbow" as Gate)
      : undefined,
  ];

  return (
    <Gates gates={gates} appData={rainbowAppData} dispatch={gateDispatcher}>
      <HeadSeo
        title={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title} | ${profile.name}`}
        description={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title}`}
        meeting={{
          title: eventType.title,
          profile: { name: `${profile.name}`, image: profile.image },
          users: [
            ...(eventType.users || []).map((user) => ({
              name: `${user.name}`,
              username: `${user.username}`,
            })),
          ],
        }}
        nextSeoProps={{
          nofollow: eventType.hidden,
          noindex: eventType.hidden,
        }}
      />
      <BookingPageTagManager eventType={eventType} />
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />
      <div>
        <main
          className={classNames(
            "flex-col md:mx-4 lg:flex",
            shouldAlignCentrally ? "items-center" : "items-start",
            !isEmbed && classNames("mx-auto my-0 ease-in-out md:my-24")
          )}>
          <div>
            <div
              style={availabilityDatePickerEmbedStyles}
              className={classNames(
                isBackgroundTransparent
                  ? ""
                  : "dark:bg-darkgray-100 sm:dark:border-darkgray-300 bg-white pb-4 md:pb-0",
                "border-bookinglightest overflow-hidden md:rounded-md md:border",
                isEmbed && "mx-auto"
              )}>
              <div className="overflow-hidden md:flex">
                <div
                  className={classNames(
                    "sm:dark:border-darkgray-200 flex flex-col border-gray-200 p-5 sm:border-r",
                    "min-w-full md:w-[280px] md:min-w-[280px]",
                    recurringEventCount && "xl:w-[380px] xl:min-w-[380px]"
                  )}>
                  <BookingDescription profile={profile} eventType={eventType} rescheduleUid={rescheduleUid}>
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
                    {stripeAppData.price > 0 && (
                      <p className="-ml-2 px-2 text-sm font-medium">
                        <Icon.FiCreditCard className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
                        <IntlProvider locale="en">
                          <FormattedNumber
                            value={stripeAppData.price / 100.0}
                            style="currency"
                            currency={stripeAppData.currency.toUpperCase()}
                          />
                        </IntlProvider>
                      </p>
                    )}
                    {timezoneDropdown}
                  </BookingDescription>

                  {!isEmbed && (
                    <div className="mt-auto hidden md:block">
                      <GoBackToPreviousPage t={t} />
                    </div>
                  )}

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
                      ? ([
                          "Sunday",
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                        ].indexOf(profile.weekStart) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
                      : profile.weekStart /* Allows providing weekStart as number */
                  }
                  eventType={eventType}
                  timeFormat={timeFormat}
                  timeZone={timeZone}
                  users={userList}
                  seatsPerTimeSlot={eventType.seatsPerTimeSlot || undefined}
                  recurringEventCount={recurringEventCount}
                  ethSignature={gateState.rainbowToken}
                />
              </div>
            </div>
            {(!eventType.users[0] || !isBrandingHidden(eventType.users[0])) && !isEmbed && <PoweredByCal />}
          </div>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </Gates>
  );
};

export default AvailabilityPage;
