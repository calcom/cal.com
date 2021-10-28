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
  const { isReady } = useTheme(props.profile.theme);

  useEffect(() => {
    setDate(date.tz(localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()));
    setIs24h(!!localStorage.getItem("timeOption.is24hClock"));
  }, []);

  const eventName = props.booking.title;

  return isReady ? (
    <div className="h-screen bg-neutral-50 dark:bg-neutral-900">
      <Head>
        <title>
          {t("payment")} | {eventName} | Cal.com
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="max-w-3xl py-24 mx-auto">
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block px-8 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white border rounded-sm dark:bg-gray-800 border-neutral-200 dark:border-neutral-700 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:py-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
                    <CreditCardIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3
                      className="text-2xl font-semibold leading-6 dark:text-white text-neutral-900"
                      id="modal-headline">
                      {t("payment")}
                    </h3>
                    <div className="mt-3">
                      <p className="text-sm text-neutral-600 dark:text-gray-300">
                        {t("pay_later_instructions")}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 py-4 mt-4 text-left text-gray-700 border-t border-b dark:text-gray-300 dark:border-gray-900">
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
                  <div className="pt-4 mt-4 text-xs text-center text-gray-400 border-t dark:border-gray-900 dark:text-white">
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
