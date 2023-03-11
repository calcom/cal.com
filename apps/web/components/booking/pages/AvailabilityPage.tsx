import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useMemo, useReducer, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";
import { z } from "zod";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useEmbedUiConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import notEmpty from "@calcom/lib/notEmpty";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { detectBrowserTimeFormat, setIs24hClockInLocalStorage, TimeFormat } from "@calcom/lib/timeFormat";
import { trpc } from "@calcom/trpc";
import { HeadSeo } from "@calcom/ui";
import { FiCreditCard, FiUser, FiRefreshCcw } from "@calcom/ui/components/icon";

import { timeZone as localStorageTimeZone } from "@lib/clock";

import type { Gate, GateState } from "@components/Gates";
import Gates from "@components/Gates";
import BookingDescription from "@components/booking/BookingDescription";
import { SlotPicker } from "@components/booking/SlotPicker";

import type { AvailabilityPageProps } from "../../../pages/[user]/[type]";
import type { DynamicAvailabilityPageProps } from "../../../pages/d/[link]/[slug]";
import type { AvailabilityTeamPageProps } from "../../../pages/team/[slug]/[type]";

const PoweredByCal = dynamic(() => import("@components/ui/PoweredByCal"));

const Toaster = dynamic(() => import("react-hot-toast").then((mod) => mod.Toaster), { ssr: false });
/*const SlotPicker = dynamic(() => import("../SlotPicker").then((mod) => mod.SlotPicker), {
  ssr: false,
  loading: () => <div className="mt-8 px-4 pb-4 sm:mt-0 sm:p-4 md:min-w-[300px] md:px-5 lg:min-w-[455px]" />,
});*/
const TimezoneDropdown = dynamic(() => import("../TimezoneDropdown").then((mod) => mod.TimezoneDropdown), {
  ssr: false,
});

const dateQuerySchema = z.object({
  rescheduleUid: z.string().optional().default(""),
  date: z.string().optional().default(""),
  timeZone: z.string().optional().default(""),
  seatReferenceUid: z.string().optional(),
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
  const paymentAppData = getPaymentAppData(eventType);
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

  const { data: bookingAttendees } = trpc.viewer.bookings.getBookingAttendees.useQuery(
    {
      seatReferenceUid: rescheduleUid,
    },
    {
      enabled: !!(rescheduleUid && eventType.seatsPerTimeSlot),
    }
  );

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
                "border-bookinglightest md:rounded-md md:border",
                isEmbed && "mx-auto"
              )}>
              <div className="md:flex">
                {showEventTypeDetails && (
                  <div
                    className={classNames(
                      "sm:dark:border-darkgray-200 flex flex-col border-gray-200 p-5 sm:border-r",
                      "min-w-full md:w-[280px] md:min-w-[280px]",
                      recurringEventCount && "xl:w-[380px] xl:min-w-[380px]"
                    )}>
                    <BookingDescription profile={profile} eventType={eventType} rescheduleUid={rescheduleUid}>
                      {rescheduleUid && eventType.seatsPerTimeSlot && bookingAttendees && (
                        <div
                          className={classNames(
                            "flex flex-nowrap items-center text-sm font-medium",
                            "dark:text-darkgray-600 text-gray-600",
                            "ltr:mr-[10px] rtl:ml-[10px]"
                          )}>
                          <FiUser
                            className={classNames(
                              "min-h-4 min-w-4 ml-[2px] inline-block ltr:mr-[10px] rtl:ml-[10px]",
                              "mt-[2px]"
                            )}
                          />{" "}
                          {t("event_type_seats", { numberOfSeats: bookingAttendees })}
                        </div>
                      )}
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
                      {paymentAppData.price > 0 && (
                        <p className="-ml-2 px-2 text-sm font-medium">
                          <FiCreditCard className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                          <IntlProvider locale="en">
                            <FormattedNumber
                              value={paymentAppData.price / 100.0}
                              style="currency"
                              currency={paymentAppData.currency?.toUpperCase()}
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
                  bookingAttendees={bookingAttendees || undefined}
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
