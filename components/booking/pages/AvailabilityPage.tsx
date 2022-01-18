// Get router variables
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, CreditCardIcon, GlobeIcon } from "@heroicons/react/solid";
import * as Collapsible from "@radix-ui/react-collapsible";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import { isBrandingHidden } from "@lib/isBrandingHidden";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";

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

const AvailabilityPage = ({ profile, eventType, workingHours }: Props) => {
  const router = useRouter();
  const { rescheduleUid } = router.query;
  const { isReady } = useTheme(profile.theme);
  const { t } = useLocale();

  const selectedDate = useMemo(() => {
    const dateString = asStringOrNull(router.query.date);
    if (dateString) {
      // todo some extra validation maybe.
      const utcOffsetAsDate = dayjs(dateString.substr(11, 14), "Hmm");
      const utcOffset = parseInt(
        dateString.substr(10, 1) + (utcOffsetAsDate.hour() * 60 + utcOffsetAsDate.minute())
      );
      const date = dayjs(dateString.substr(0, 10)).utcOffset(utcOffset, true);
      return date.isValid() ? date : null;
    }
    return null;
  }, [router.query.date]);

  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState("h:mma");
  const telemetry = useTelemetry();

  useEffect(() => {
    handleToggle24hClock(localStorage.getItem("timeOption.is24hClock") === "true");
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.pageView, collectPageParameters()));
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

  return (
    <>
      <HeadSeo
        title={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title} | ${profile.name}`}
        description={`${rescheduleUid ? t("reschedule") : ""} ${eventType.title}`}
        name={profile.name || undefined}
        avatar={profile.image || undefined}
      />
      <CustomBranding val={profile.brandColor} />
      <div>
        <main
          className={
            "mx-auto my-0 md:my-24 transition-max-width ease-in-out duration-500 " +
            (selectedDate ? "max-w-5xl" : "max-w-3xl")
          }>
          {isReady && (
            <div className="bg-white border-gray-200 rounded-sm sm:dark:border-gray-600 dark:bg-gray-900 md:border">
              {/* mobile: details */}
              <div className="block p-4 sm:p-8 md:hidden">
                <div className="flex items-center">
                  <AvatarGroup
                    items={
                      [
                        { image: profile.image, alt: profile.name, title: profile.name },
                        ...eventType.users
                          .filter((user) => user.name !== profile.name)
                          .map((user) => ({
                            title: user.name,
                            image: user.avatar || undefined,
                            alt: user.name || undefined,
                          })),
                      ].filter((item) => !!item.image) as { image: string; alt?: string; title?: string }[]
                    }
                    size={9}
                    truncateAfter={5}
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-black dark:text-gray-300">{profile.name}</p>
                    <div className="flex gap-2 text-xs font-medium text-gray-600">
                      {eventType.title}
                      <div>
                        <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                        {eventType.length} {t("minutes")}
                      </div>
                      {eventType.price > 0 && (
                        <div>
                          <CreditCardIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                          <IntlProvider locale="en">
                            <FormattedNumber
                              value={eventType.price / 100.0}
                              style="currency"
                              currency={eventType.currency.toUpperCase()}
                            />
                          </IntlProvider>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-gray-600 dark:text-gray-200">{eventType.description}</p>
              </div>

              <div className="px-4 sm:flex sm:py-5 sm:p-4">
                <div
                  className={
                    "hidden md:block pr-8 sm:border-r sm:dark:border-gray-800 " +
                    (selectedDate ? "sm:w-1/3" : "sm:w-1/2")
                  }>
                  <AvatarGroup
                    items={
                      [
                        { image: profile.image, alt: profile.name, title: profile.name },
                        ...eventType.users
                          .filter((user) => user.name !== profile.name)
                          .map((user) => ({
                            title: user.name,
                            alt: user.name,
                            image: user.avatar,
                          })),
                      ].filter((item) => !!item.image) as { image: string; alt?: string; title?: string }[]
                    }
                    size={10}
                    truncateAfter={3}
                  />
                  <h2 className="mt-3 font-medium text-gray-500 dark:text-gray-300">{profile.name}</h2>
                  <h1 className="mb-4 text-3xl font-semibold text-gray-800 font-cal dark:text-white">
                    {eventType.title}
                  </h1>
                  <p className="px-2 py-1 mb-1 -ml-2 text-gray-500">
                    <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                    {eventType.length} {t("minutes")}
                  </p>
                  {eventType.price > 0 && (
                    <p className="px-2 py-1 mb-1 -ml-2 text-gray-500">
                      <CreditCardIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
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

                  <p className="mt-3 mb-8 text-gray-600 dark:text-gray-200">{eventType.description}</p>
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

                <div className="block mt-4 ml-1 sm:hidden">
                  <TimezoneDropdown />
                </div>

                {selectedDate && (
                  <AvailableTimes
                    timeFormat={timeFormat}
                    minimumBookingNotice={eventType.minimumBookingNotice}
                    eventTypeId={eventType.id}
                    slotInterval={eventType.slotInterval}
                    eventLength={eventType.length}
                    date={selectedDate}
                    users={eventType.users}
                    schedulingType={eventType.schedulingType ?? null}
                  />
                )}
              </div>
            </div>
          )}
          {(!eventType.users[0] || !isBrandingHidden(eventType.users[0])) && <PoweredByCal />}
        </main>
      </div>
    </>
  );

  function TimezoneDropdown() {
    return (
      <Collapsible.Root open={isTimeOptionsOpen} onOpenChange={setIsTimeOptionsOpen}>
        <Collapsible.Trigger className="px-2 py-1 mb-1 -ml-2 text-left text-gray-500 min-w-32">
          <GlobeIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
          {timeZone()}
          {isTimeOptionsOpen ? (
            <ChevronUpIcon className="inline-block w-4 h-4 ml-1 -mt-1" />
          ) : (
            <ChevronDownIcon className="inline-block w-4 h-4 ml-1 -mt-1" />
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
