"use client";

import classNames from "classnames";
import dynamic from "next/dynamic";
import Head from "next/head";
import type { FC } from "react";
import { useEffect, useState } from "react";

import { getSuccessPageLocationMessage } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { PayIcon } from "@calcom/features/bookings/components/event-meta/PayIcon";
import { Price } from "@calcom/features/bookings/components/event-meta/Price";
import { APP_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { getIs24hClockFromLocalStorage, isBrowserLocale24h } from "@calcom/lib/timeFormat";
import { localStorage } from "@calcom/lib/webstorage";

import type { PaymentPageProps } from "../pages/payment";

const StripePaymentComponent = dynamic(() => import("./Payment"), {
  ssr: false,
});

const PaypalPaymentComponent = dynamic(
  () =>
    import("@calcom/app-store/paypal/components/PaypalPaymentComponent").then(
      (m) => m.PaypalPaymentComponent
    ),
  {
    ssr: false,
  }
);

const AlbyPaymentComponent = dynamic(
  () => import("@calcom/app-store/alby/components/AlbyPaymentComponent").then((m) => m.AlbyPaymentComponent),
  {
    ssr: false,
  }
);

const PaymentPage: FC<PaymentPageProps> = (props) => {
  const { t, i18n } = useLocale();
  const [is24h, setIs24h] = useState(isBrowserLocale24h());
  const [date, setDate] = useState(dayjs.utc(props.booking.startTime));
  const [timezone, setTimezone] = useState<string | null>(null);
  useTheme(props.profile.theme);
  const isEmbed = useIsEmbed();
  const paymentAppData = getPaymentAppData(props.eventType);
  useEffect(() => {
    let embedIframeWidth = 0;
    const _timezone =
      localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess() || "Europe/London";
    setTimezone(_timezone);
    setDate(date.tz(_timezone));
    setIs24h(!!getIs24hClockFromLocalStorage());
    if (isEmbed) {
      requestAnimationFrame(function fixStripeIframe() {
        // HACK: Look for stripe iframe and center position it just above the embed content
        const stripeIframeWrapper = document.querySelector(
          'iframe[src*="https://js.stripe.com/v3/authorize-with-url-inner"]'
        )?.parentElement;
        if (stripeIframeWrapper) {
          stripeIframeWrapper.style.margin = "0 auto";
          stripeIframeWrapper.style.width = `${embedIframeWidth}px`;
        }
        requestAnimationFrame(fixStripeIframe);
      });
      sdkActionManager?.on("__dimensionChanged", (e) => {
        embedIframeWidth = e.detail.data.iframeWidth as number;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbed]);

  const eventName = props.booking.title;

  return (
    <div className="h-screen">
      <Head>
        <title>
          {t("payment")} | {eventName} | {APP_NAME}
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="mx-auto max-w-3xl py-24">
        <div className="fixed inset-0 z-50 overflow-y-auto scroll-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div className="inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
                &#8203;
              </span>
              <div
                className={classNames(
                  "main bg-default border-subtle inline-block transform overflow-hidden rounded-lg border px-8 pb-4 pt-5 text-left align-bottom transition-all  sm:w-full sm:max-w-lg sm:py-6 sm:align-middle",
                  isEmbed ? "" : "sm:my-8"
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="bg-success mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                    <PayIcon currency={paymentAppData.currency} className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-emphasis text-2xl font-semibold leading-6" id="modal-headline">
                      {paymentAppData.paymentOption === "HOLD" ? t("complete_your_booking") : t("payment")}
                    </h3>
                    <div className="text-default mt-4 grid grid-cols-3 border-b border-t py-4 text-left dark:border-gray-900 dark:text-gray-300">
                      <div className="font-medium">{t("what")}</div>
                      <div className="col-span-2 mb-6">{eventName}</div>
                      <div className="font-medium">{t("when")}</div>
                      <div className="col-span-2 mb-6">
                        {date.format("dddd, DD MMMM YYYY")}
                        <br />
                        {date.format(is24h ? "H:mm" : "h:mma")} - {props.eventType.length} mins{" "}
                        <span className="text-subtle">({timezone})</span>
                      </div>
                      {props.booking.location && (
                        <>
                          <div className="font-medium">{t("where")}</div>
                          <div className="col-span-2 mb-6">
                            {getSuccessPageLocationMessage(props.booking.location, t)}
                          </div>
                        </>
                      )}
                      <div className="font-medium">
                        {props.payment.paymentOption === "HOLD" ? t("no_show_fee") : t("price")}
                      </div>
                      <div className="col-span-2 mb-6 font-semibold">
                        <Price
                          currency={paymentAppData.currency}
                          price={paymentAppData.price}
                          displayAlternateSymbol={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  {props.payment.success && !props.payment.refunded && (
                    <div className="text-default mt-4 text-center dark:text-gray-300">{t("paid")}</div>
                  )}
                  {props.payment.appId === "stripe" && !props.payment.success && (
                    <StripePaymentComponent
                      clientSecret={props.clientSecret}
                      payment={props.payment}
                      eventType={props.eventType}
                      user={props.user}
                      location={props.booking.location}
                      booking={props.booking}
                    />
                  )}
                  {props.payment.appId === "paypal" && !props.payment.success && (
                    <PaypalPaymentComponent payment={props.payment} />
                  )}
                  {props.payment.appId === "alby" && !props.payment.success && (
                    <AlbyPaymentComponent payment={props.payment} paymentPageProps={props} />
                  )}
                  {props.payment.refunded && (
                    <div className="text-default mt-4 text-center dark:text-gray-300">{t("refunded")}</div>
                  )}
                </div>
                {!props.profile.hideBranding && (
                  <div className="text-muted dark:text-inverted mt-4 border-t pt-4 text-center text-xs dark:border-gray-900">
                    <a href={`${WEBSITE_URL}/signup`}>
                      {t("create_booking_link_with_calcom", { appName: APP_NAME })}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;
