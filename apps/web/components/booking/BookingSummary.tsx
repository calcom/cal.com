import { FormattedNumber, IntlProvider } from "react-intl";
import { z } from "zod";

import getStripeAppData from "@calcom/lib/getStripeAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { parseDate, parseRecurringDates } from "@calcom/lib/parseDate";
import { getEveryFreqFor, getRecurringFreq } from "@calcom/lib/recurringStrings";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { SkeletonLoader, Tooltip } from "@calcom/ui";
import { FiCalendar, FiCreditCard, FiRefreshCw, FiUser } from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";
import { timeZone } from "@lib/clock";
import { useBookingPageParams, useBookingPageQuery } from "@lib/hooks/useBookingPageQuery";
import useRouterQuery from "@lib/hooks/useRouterQuery";

import BookingDescription from "@components/booking/BookingDescription";

function useRecurringStrings({ ...opts }: Parameters<typeof parseRecurringDates>[0]) {
  const { i18n } = useLocale();
  // Calculate the booking date(s)
  let recurringStrings: string[] = [],
    recurringDates: Date[] = [];
  if (opts?.recurringEvent?.freq && opts?.recurringCount !== null) {
    [recurringStrings, recurringDates] = parseRecurringDates(opts, i18n.language);
  }
  return [recurringStrings, recurringDates] as const;
}

const RecurringSummary = ({
  recurringEvent,
  recurringCount,
}: {
  recurringEvent: RecurringEvent;
  recurringCount: number;
}) => {
  const {
    data: { date },
  } = useTypedQuery(z.object({ date: z.string().optional().default("") }));
  const { t, i18n } = useLocale();
  const {
    data: { rescheduleUid },
  } = useBookingPageParams();
  const [recurringStrings] = useRecurringStrings({
    recurringEvent,
    recurringCount,
    startDate: date,
    timeZone: timeZone(),
  });

  return (
    <div className="text-bookinghighlight flex items-start text-sm">
      <FiCalendar className="ml-[2px] mt-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
      <div className="text-sm font-medium">
        {(rescheduleUid || !recurringEvent?.freq) && `${parseDate(date, i18n.language)}`}
        {!rescheduleUid &&
          recurringEvent?.freq &&
          recurringStrings.slice(0, 5).map((timeFormatted, key) => {
            return <p key={key}>{timeFormatted}</p>;
          })}
        {!rescheduleUid && recurringEvent?.freq && recurringStrings.length > 5 && (
          <div className="flex">
            <Tooltip
              content={recurringStrings.slice(5).map((timeFormatted, key) => (
                <p key={key}>{timeFormatted}</p>
              ))}>
              <p className="dark:text-darkgray-600 text-sm">
                +{" "}
                {t("plus_more", {
                  count: recurringStrings.length - 5,
                })}
              </p>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};

const RecurringInfo = ({
  recurringEvent,
  recurringCount,
}: {
  recurringEvent: RecurringEvent;
  recurringCount: number;
}) => {
  const { t } = useLocale();
  const { count, setQuery } = useRouterQuery("count");

  return (
    <div className="items-start text-sm font-medium text-gray-600 dark:text-white">
      <FiRefreshCw className="ml-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
      {(() => {
        if (true)
          return (
            <span>
              <p className="mb-1 -ml-2 inline px-2 py-1">{getRecurringFreq({ t, recurringEvent })}</p>
              <input
                type="number"
                min="1"
                max={recurringEvent.count}
                className="dark:bg-darkgray-200 h-7 w-11 rounded-sm border-gray-300 bg-white text-sm font-medium [appearance:textfield] ltr:mr-2 rtl:ml-2 dark:border-gray-500"
                defaultValue={count || recurringEvent.count}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
              />
              <p className="inline">{t("occurrence", { count: recurringCount || 0 })}</p>
            </span>
          );

        return (
          <p className="-ml-2 inline-block items-center px-2">
            {getEveryFreqFor({
              t,
              recurringEvent,
              recurringCount,
            })}
          </p>
        );
      })()}
    </div>
  );
};

export const BookingSummary = (): JSX.Element => {
  const { t } = useLocale();
  const {
    data: { rescheduleUid },
  } = useBookingPageParams();
  const query = useBookingPageQuery();
  return (
    <QueryCell
      query={query}
      success={({ data: { profile, eventType, booking, recurringEventCount } }) => {
        const { recurringEvent } = eventType;
        const stripeAppData = getStripeAppData(eventType);
        return (
          <div>
            <BookingDescription profile={profile} eventType={eventType} rescheduleUid={rescheduleUid}>
              {!rescheduleUid && recurringEvent && recurringEventCount && (
                <RecurringInfo recurringEvent={recurringEvent} recurringCount={recurringEventCount} />
              )}
              {recurringEvent && recurringEventCount && (
                <RecurringSummary recurringEvent={recurringEvent} recurringCount={recurringEventCount} />
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
              {/* {timezoneDropdown} */}
              {stripeAppData.price > 0 && (
                <p className="text-bookinglight -ml-2 px-2 text-sm ">
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

              {booking?.startTime && rescheduleUid && (
                <div>
                  <p className="mt-8 mb-2 text-sm " data-testid="former_time_p">
                    {t("former_time")}
                  </p>
                  <p className="line-through ">
                    <FiCalendar className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                    {typeof booking.startTime === "string" && parseDate(dayjs(booking.startTime), i18n)}
                  </p>
                </div>
              )}
              {!!eventType.seatsPerTimeSlot && (
                <div className="text-bookinghighlight flex items-start text-sm">
                  <FiUser
                    className={`ml-[2px] mt-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px] ${
                      booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.5
                        ? "text-rose-600"
                        : booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.33
                        ? "text-yellow-500"
                        : "text-bookinghighlight"
                    }`}
                  />
                  <p
                    className={`${
                      booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.5
                        ? "text-rose-600"
                        : booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.33
                        ? "text-yellow-500"
                        : "text-bookinghighlight"
                    } mb-2 font-medium`}>
                    {booking
                      ? eventType.seatsPerTimeSlot - booking.attendees.length
                      : eventType.seatsPerTimeSlot}{" "}
                    / {eventType.seatsPerTimeSlot} {t("seats_available")}
                  </p>
                </div>
              )}
            </BookingDescription>
          </div>
        );
      }}
      customLoader={<SkeletonLoader />}
    />
  );
};
