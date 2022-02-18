import { CreditCardIcon } from "@heroicons/react/solid";
import { Elements } from "@stripe/react-stripe-js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";
import Head from "next/head";
import React, { FC, useEffect, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import PaymentComponent from "@ee/components/stripe/Payment";
import getStripe from "@ee/lib/stripe/client";
import { PaymentPageProps } from "@ee/pages/payment/[uid]";

import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";

dayjs.extend(utc);
dayjs.extend(toArray);
dayjs.extend(timezone);

const PaymentPage: FC<PaymentPageProps> = (props) => {
  const { t } = useLocale();
  const [is24h, setIs24h] = useState(false);
  const [date, setDate] = useState(dayjs.utc(props.booking.startTime));
  const { isReady, Theme } = useTheme(props.profile.theme);

  useEffect(() => {
    setDate(date.tz(localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()));
    setIs24h(!!localStorage.getItem("timeOption.is24hClock"));
  }, []);

  const eventName = props.booking.title;

  return isReady ? (
    <div className="h-screen bg-neutral-50 dark:bg-neutral-900">
      <Theme />
      <Head>
        <title>
          {t("payment")} | {eventName} | Cal.com
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
                className="inline-block transform overflow-hidden rounded-sm border border-neutral-200 bg-white px-8 pt-5 pb-4 text-left align-bottom transition-all dark:border-neutral-700 dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-lg sm:py-6 sm:align-middle"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CreditCardIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3
                      className="text-2xl font-semibold leading-6 text-neutral-900 dark:text-white"
                      id="modal-headline">
                      {t("payment")}
                    </h3>
                    <div className="mt-3">
                      <p className="text-sm text-neutral-600 dark:text-gray-300">
                        {t("pay_later_instructions")}
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-3 border-t border-b py-4 text-left text-gray-700 dark:border-gray-900 dark:text-gray-300">
                      <div className="font-medium">{t("what")}</div>
                      <div className="col-span-2 mb-6">{eventName}</div>
                      <div className="font-medium">{t("when")}</div>
                      <div className="col-span-2 mb-6">
                        {date.format("dddd, DD MMMM YYYY")}
                        <br />
                        {date.format(is24h ? "H:mm" : "h:mma")} - {props.eventType.length} mins{" "}
                        <span className="text-gray-500">
                          ({localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()})
                        </span>
                      </div>
                      {props.booking.location && (
                        <>
                          <div className="font-medium">{t("where")}</div>
                          <div className="col-span-2 mb-6">{props.booking.location}</div>
                        </>
                      )}
                      <div className="font-medium">{t("price")}</div>
                      <div className="col-span-2 mb-6">
                        <IntlProvider locale="en">
                          <FormattedNumber
                            value={props.eventType.price / 100.0}
                            style="currency"
                            currency={props.eventType.currency.toUpperCase()}
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
                      />
                    </Elements>
                  )}
                  {props.payment.refunded && (
                    <div className="mt-4 text-center text-gray-700 dark:text-gray-300">{t("refunded")}</div>
                  )}
                </div>
                {!props.profile.hideBranding && (
                  <div className="mt-4 border-t pt-4 text-center text-xs text-gray-400 dark:border-gray-900 dark:text-white">
                    <a href="https://cal.com/signup">{t("create_booking_link_with_calcom")}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  ) : null;
};

export default PaymentPage;
