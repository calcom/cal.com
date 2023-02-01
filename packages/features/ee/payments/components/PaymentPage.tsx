import { Elements } from "@stripe/react-stripe-js";
import classNames from "classnames";
import Head from "next/head";
import { FC, useEffect, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { getSuccessPageLocationMessage } from "@calcom/app-store/locations";
import getStripe from "@calcom/app-store/stripepayment/lib/client";
import dayjs from "@calcom/dayjs";
import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { APP_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { getIs24hClockFromLocalStorage, isBrowserLocale24h } from "@calcom/lib/timeFormat";
import { localStorage } from "@calcom/lib/webstorage";
import { FiCreditCard } from "@calcom/ui/components/icon";

import type { PaymentPageProps } from "../pages/payment";
import PaymentComponent from "./Payment";

const PaymentPage: FC<PaymentPageProps> = (props) => {
  const { t } = useLocale();
  const [is24h, setIs24h] = useState(isBrowserLocale24h());
  const [date, setDate] = useState(dayjs.utc(props.booking.startTime));
  const [timezone, setTimezone] = useState<string | null>(null);
  useTheme(props.profile.theme);
  const isEmbed = useIsEmbed();
  const stripeAppData = getStripeAppData(props.eventType);
  useEffect(() => {
    let embedIframeWidth = 0;
    const _timezone = localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess();
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
          stripeIframeWrapper.style.width = embedIframeWidth + "px";
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
                &#8203;
              </span>
              <div
                className={classNames(
                  "main inline-block transform overflow-hidden rounded-lg border border-neutral-200 bg-white px-8 pt-5 pb-4 text-left align-bottom transition-all dark:border-neutral-700 dark:bg-gray-800  sm:w-full sm:max-w-lg sm:py-6 sm:align-middle",
                  isEmbed ? "" : "sm:my-8"
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <FiCreditCard className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="mt-3 text-center sm:mt-5">
                    <h3
                      className="text-2xl font-semibold leading-6 text-gray-900 dark:text-white"
                      id="modal-headline">
                      {t("payment")}
                    </h3>
                    <div className="mt-4 grid grid-cols-3 border-t border-b py-4 text-left text-gray-700 dark:border-gray-900 dark:text-gray-300">
                      <div className="font-medium">{t("what")}</div>
                      <div className="col-span-2 mb-6">{eventName}</div>
                      <div className="font-medium">{t("when")}</div>
                      <div className="col-span-2 mb-6">
                        {date.format("dddd, DD MMMM YYYY")}
                        <br />
                        {date.format(is24h ? "H:mm" : "h:mma")} - {props.eventType.length} mins{" "}
                        <span className="text-gray-500">({timezone})</span>
                      </div>
                      {props.booking.location && (
                        <>
                          <div className="font-medium">{t("where")}</div>
                          <div className="col-span-2 mb-6">
                            {getSuccessPageLocationMessage(props.booking.location, t)}
                          </div>
                        </>
                      )}
                      <div className="font-medium">{t("price")}</div>
                      <div className="col-span-2 mb-6">
                        <IntlProvider locale="en">
                          <FormattedNumber
                            value={stripeAppData.price / 100.0}
                            style="currency"
                            currency={stripeAppData.currency.toUpperCase()}
                          />
                        </IntlProvider>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  {props.payment.success && !props.payment.refunded && (
                    <div className="mt-4 text-center text-gray-700 dark:text-gray-300">{t("paid")}</div>
                  )}
                  {!props.payment.success && (
                    <Elements stripe={getStripe(props.payment.data.stripe_publishable_key)}>
                      <PaymentComponent
                        payment={props.payment}
                        eventType={props.eventType}
                        user={props.user}
                        location={props.booking.location}
                        bookingId={props.booking.id}
                        bookingUid={props.booking.uid}
                      />
                    </Elements>
                  )}
                  {props.payment.refunded && (
                    <div className="mt-4 text-center text-gray-700 dark:text-gray-300">{t("refunded")}</div>
                  )}
                </div>
                {!props.profile.hideBranding && (
                  <div className="mt-4 border-t pt-4 text-center text-xs text-gray-400 dark:border-gray-900 dark:text-white">
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
