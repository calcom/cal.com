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
  RefreshIcon,
} from "@heroicons/react/solid";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useContracts } from "contexts/contractsContext";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";
import { Frequency as RRuleFrequency } from "rrule";

import {
  useEmbedStyles,
  useIsEmbed,
  useIsBackgroundTransparent,
  sdkActionManager,
  useEmbedType,
  useEmbedNonStylesConfig,
} from "@calcom/embed-core";
import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
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
  let isBackgroundTransparent = useIsBackgroundTransparent();
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

    telemetry.withJitsu((jitsu) =>
      jitsu.track(
        top !== window ? telemetryEventTypes.embedView : telemetryEventTypes.pageView,
        collectPageParameters("/availability", { isTeamBooking: document.URL.includes("team/") })
      )
    );
  }, [telemetry]);

  const changeDate = (newDate: Dayjs) => {
    router.replace(
      {
        query: {
          ...router.query,
          date: newDate.format("YYYY-MM-DDZZ"),
        },
      },
      undefined,
      {
        shallow: true,
      }
    );
  };

  const handleSelectTimeZone = (selectedTimeZone: string): void => {
    if (selectedDate) {
      changeDate(selectedDate.tz(selectedTimeZone, true));
    }
    timeZone(selectedTimeZone);
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
                            image: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${user.username}/avatar.png`,
                            alt: user.name || undefined,
                          })),
                      ].filter((item) => !!item.image) as { image: string; alt?: string; title?: string }[]
                    }
                    size={9}
                    truncateAfter={5}
                  />
                  <div className="mt-4">
                    <p className="text-sm font-medium text-black dark:text-white">{profile.name}</p>
                    <div className="mt-2 gap-2 dark:text-gray-100">
                      <h1 className="text-bookingdark mb-4 text-xl font-semibold dark:text-white">
                        {eventType.title}
                      </h1>
                      {eventType?.description && (
                        <p className="text-bookinglight mb-2 dark:text-white">
                          <InformationCircleIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
                          {eventType.description}
                        </p>
                      )}
                      <p className="text-bookinglight mb-2 dark:text-white">
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
                              className="mt-8 mb-2 text-gray-600 dark:text-white"
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

              <div className="px-4 sm:flex sm:p-4 sm:py-5">
                <div
                  className={
                    "hidden pr-8 sm:border-r sm:dark:border-gray-700 md:flex md:flex-col " +
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
                            image: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${user.username}/avatar.png`,
                          })),
                      ].filter((item) => !!item.image) as { image: string; alt?: string; title?: string }[]
                    }
                    size={10}
                    truncateAfter={3}
                  />
                  <h2 className="mt-3 font-medium text-gray-500 dark:text-gray-300">{profile.name}</h2>
                  <h1 className="font-cal mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                    {eventType.title}
                  </h1>
                  {eventType?.description && (
                    <p className="text-bookinglight mb-3 dark:text-white">
                      <InformationCircleIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                      {eventType.description}
                    </p>
                  )}
                  <p className="text-bookinglight mb-3 dark:text-white">
                    <ClockIcon className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                    {eventType.length} {t("minutes")}
                  </p>
                  {!rescheduleUid && eventType.recurringEvent?.count && eventType.recurringEvent?.freq && (
                    <div className="mb-3 text-gray-600 dark:text-white">
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
                        className="w-16 rounded-sm border-gray-300 bg-white text-gray-600 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 dark:border-gray-500 dark:bg-gray-600 dark:text-white sm:text-sm"
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
                    <p className="mb-1 -ml-2 px-2 py-1 text-gray-600 dark:text-white">
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
                  {previousPage === `${WEBAPP_URL}/${profile.slug}` && (
                    <div className="flex h-full flex-col justify-end">
                      <ArrowLeftIcon
                        className="h-4 w-4 text-black  transition-opacity hover:cursor-pointer dark:text-white"
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
        <Collapsible.Trigger className="min-w-32 mb-1 -ml-2 px-2 py-1 text-left text-gray-600 dark:text-white">
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
