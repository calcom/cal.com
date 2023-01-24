import { useAutoAnimate } from "@formkit/auto-animate/react";
import { EventType } from "@prisma/client";
import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/router";
import { useReducer, useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { FormattedNumber, IntlProvider } from "react-intl";
import { z } from "zod";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import dayjs, { Dayjs } from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useEmbedUiConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import DatePicker from "@calcom/features/calendars/DatePicker";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import notEmpty from "@calcom/lib/notEmpty";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { detectBrowserTimeFormat, setIs24hClockInLocalStorage, TimeFormat } from "@calcom/lib/timeFormat";
import { trpc } from "@calcom/trpc/react";
import { HeadSeo } from "@calcom/ui";
import { FiChevronDown, FiChevronUp, FiCreditCard, FiGlobe, FiRefreshCcw } from "@calcom/ui/components/icon";

import { timeZone as localStorageTimeZone } from "@lib/clock";
import useRouterQuery from "@lib/hooks/useRouterQuery";

import Gates, { Gate, GateState } from "@components/Gates";
import AvailableTimes from "@components/booking/AvailableTimes";
import BookingDescription from "@components/booking/BookingDescription";
import TimeOptions from "@components/booking/TimeOptions";
import PoweredByCal from "@components/ui/PoweredByCal";

import type { AvailabilityPageProps } from "../../../pages/[user]/[type]";
import type { DynamicAvailabilityPageProps } from "../../../pages/d/[link]/[slug]";
import type { AvailabilityTeamPageProps } from "../../../pages/team/[slug]/[type]";

const useSlots = ({
  eventTypeId,
  eventTypeSlug,
  startTime,
  endTime,
  usernameList,
  timeZone,
  duration,
}: {
  eventTypeId: number;
  eventTypeSlug: string;
  startTime?: Dayjs;
  endTime?: Dayjs;
  usernameList: string[];
  timeZone?: string;
  duration?: string;
}) => {
  const { data, isLoading, isPaused } = trpc.viewer.public.slots.getSchedule.useQuery(
    {
      eventTypeId,
      eventTypeSlug,
      usernameList,
      startTime: startTime?.toISOString() || "",
      endTime: endTime?.toISOString() || "",
      timeZone,
      duration,
    },
    {
      enabled: !!startTime && !!endTime,
    }
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
  onTimeFormatChange,
  timeZone,
  recurringEventCount,
  users,
  seatsPerTimeSlot,
  weekStart = 0,
  ethSignature,
}: {
  eventType: Pick<EventType, "id" | "schedulingType" | "slug">;
  timeFormat: TimeFormat;
  onTimeFormatChange: (is24Hour: boolean) => void;
  timeZone?: string;
  seatsPerTimeSlot?: number;
  recurringEventCount?: number;
  users: string[];
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  ethSignature?: string;
}) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>();
  const [browsingDate, setBrowsingDate] = useState<Dayjs>();
  const { duration } = useRouterQuery("duration");
  const { date, setQuery: setDate } = useRouterQuery("date");
  const { month, setQuery: setMonth } = useRouterQuery("month");
  const router = useRouter();

  const [slotPickerRef] = useAutoAnimate<HTMLDivElement>();

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
  }, [router.isReady, month, date, duration, timeZone]);

  const { i18n, isLocaleReady } = useLocale();
  const { slots: _1 } = useSlots({
    eventTypeId: eventType.id,
    eventTypeSlug: eventType.slug,
    usernameList: users,
    startTime: selectedDate?.startOf("day"),
    endTime: selectedDate?.endOf("day"),
    timeZone,
    duration,
  });
  const { slots: _2, isLoading } = useSlots({
    eventTypeId: eventType.id,
    eventTypeSlug: eventType.slug,
    usernameList: users,
    startTime:
      browsingDate === undefined || browsingDate.get("month") === dayjs.tz(undefined, timeZone).get("month")
        ? dayjs.tz(undefined, timeZone).subtract(2, "days").startOf("day")
        : browsingDate?.startOf("month"),
    endTime: browsingDate?.endOf("month"),
    timeZone,
    duration,
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
          onTimeFormatChange={onTimeFormatChange}
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
  onChangeTimeZone,
  timeZone,
}: {
  onChangeTimeZone: (newTimeZone: string) => void;
  timeZone?: string;
}) {
  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);

  const handleSelectTimeZone = (newTimeZone: string) => {
    onChangeTimeZone(newTimeZone);
    localStorageTimeZone(newTimeZone);
    setIsTimeOptionsOpen(false);
  };

  return (
    <Popover.Root open={isTimeOptionsOpen} onOpenChange={setIsTimeOptionsOpen}>
      <Popover.Trigger className="min-w-32 dark:text-darkgray-600 radix-state-open:bg-gray-200 dark:radix-state-open:bg-darkgray-200 group relative mb-2 -ml-2 !mt-2 inline-block self-start rounded-md px-2 py-2 text-left text-gray-600">
        <p className="flex items-center text-sm font-medium">
          <FiGlobe className="min-h-4 min-w-4 ml-[2px] -mt-[2px] inline-block ltr:mr-[10px] rtl:ml-[10px]" />
          {timeZone}
          {isTimeOptionsOpen ? (
            <FiChevronUp className="min-h-4 min-w-4 ml-1 inline-block" />
          ) : (
            <FiChevronDown className="min-h-4 min-w-4 ml-1 inline-block" />
          )}
        </p>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          hideWhenDetached
          align="start"
          className="animate-fade-in-up absolute left-0 top-2 w-80 max-w-[calc(100vw_-_1.5rem)]">
          <TimeOptions onSelectTimeZone={handleSelectTimeZone} />
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

export type Props = AvailabilityTeamPageProps | AvailabilityPageProps | DynamicAvailabilityPageProps;

const AvailabilityPage = ({ profile, eventType, ...restProps }: Props) => {
  const router = useRouter();
  const isEmbed = useIsEmbed(restProps.isEmbed);
  const query = dateQuerySchema.parse(router.query);
  const { rescheduleUid } = query;
  useTheme(profile.theme);
  const { t } = useLocale();
  const availabilityDatePickerEmbedStyles = useEmbedStyles("availabilityDatePicker");
  //TODO: Plan to remove shouldAlignCentrallyInEmbed config
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const isBackgroundTransparent = useIsBackgroundTransparent();

  const [timeZone, setTimeZone] = useState<string>();
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(detectBrowserTimeFormat);

  const onTimeFormatChange = (is24Hours: boolean) => {
    setTimeFormat(is24Hours ? TimeFormat.TWENTY_FOUR_HOUR : TimeFormat.TWELVE_HOUR);
    setIs24hClockInLocalStorage(is24Hours);
  };

  const [gateState, gateDispatcher] = useReducer(
    (state: GateState, newState: Partial<GateState>) => ({
      ...state,
      ...newState,
    }),
    {}
  );

  useEffect(() => {
    setTimeZone(localStorageTimeZone() || dayjs.tz.guess());
  }, []);

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
  const embedUiConfig = useEmbedUiConfig();
  // get dynamic user list here
  const userList = eventType.users ? eventType.users.map((user) => user.username).filter(notEmpty) : [];

  const timezoneDropdown = useMemo(
    () => <TimezoneDropdown timeZone={timeZone} onChangeTimeZone={setTimeZone} />,
    [timeZone]
  );
  const stripeAppData = getStripeAppData(eventType);
  const rainbowAppData = getEventTypeAppData(eventType, "rainbow") || {};
  const rawSlug = profile.slug ? profile.slug.split("/") : [];
  if (rawSlug.length > 1) rawSlug.pop(); //team events have team name as slug, but user events have [user]/[type] as slug.

  const showEventTypeDetails = (isEmbed && !embedUiConfig.hideEventTypeDetails) || !isEmbed;

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
            "flex flex-col md:mx-4",
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
                {showEventTypeDetails && (
                  <div
                    className={classNames(
                      "sm:dark:border-darkgray-200 flex flex-col border-gray-200 p-5 sm:border-r",
                      "min-w-full md:w-[230px] md:min-w-[230px]",
                      recurringEventCount && "xl:w-[380px] xl:min-w-[380px]"
                    )}>
                    <BookingDescription profile={profile} eventType={eventType} rescheduleUid={rescheduleUid}>
                      {!rescheduleUid && eventType.recurringEvent && (
                        <div className="flex items-start text-sm font-medium">
                          <FiRefreshCcw className="float-left mt-[7px] ml-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px] " />
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
                          <FiCreditCard className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
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

                    {/* Temporarily disabled - booking?.startTime && rescheduleUid && (
                    <div>
                      <p
                        className="mt-4 mb-3 text-gray-600 dark:text-darkgray-600"
                        data-testid="former_time_p_desktop">
                        {t("former_time")}
                      </p>
                      <p className="text-gray-500 line-through dark:text-darkgray-600">
                        <CalendarIcon className="ltr:mr-[10px] rtl:ml-[10px] -mt-1 inline-block h-4 w-4 text-gray-500" />
                        {typeof booking.startTime === "string" && parseDate(dayjs(booking.startTime), i18n)}
                      </p>
                    </div>
                  )*/}
                  </div>
                )}
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
                  onTimeFormatChange={onTimeFormatChange}
                  timeZone={timeZone}
                  users={userList}
                  seatsPerTimeSlot={eventType.seatsPerTimeSlot || undefined}
                  recurringEventCount={recurringEventCount}
                  ethSignature={gateState.rainbowToken}
                />
              </div>
            </div>
            {/* FIXME: We don't show branding in Embed yet because we need to place branding on top of the main content. Keeping it outside the main content would have visibility issues because outside main content background is transparent */}
            {!restProps.isBrandingHidden && !isEmbed && <PoweredByCal />}
          </div>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </Gates>
  );
};

export default AvailabilityPage;
