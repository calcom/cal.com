import { CreditCardIcon } from "@heroicons/react/solid";
import { Elements } from "@stripe/react-stripe-js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";
import Head from "next/head";
import React, { FC, useEffect, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import getStripe from "@calcom/stripe/client";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/Dialog";
import PaymentComponent from "@ee/components/stripe/Payment";
import { PaymentPageProps } from "@ee/pages/payment/[uid]";

import useTheme from "@lib/hooks/useTheme";
import { isBrowserLocale24h } from "@lib/timeFormat";

dayjs.extend(utc);
dayjs.extend(toArray);
dayjs.extend(timezone);

const PaymentPage: FC<PaymentPageProps> = (props) => {
  const { t } = useLocale();
  const [is24h, setIs24h] = useState(isBrowserLocale24h());
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
        <Dialog defaultOpen={true}>
          <DialogContent
            onInteractOutside={(e) => {
              e.preventDefault();
            }}>
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
                  <p className="text-sm text-neutral-600 dark:text-gray-300">{t("pay_later_instructions")}</p>
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
            <div className="mt-5 sm:mt-6">
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
              <div className="flex justify-center">
                <DialogFooter>
                  {!props.profile.hideBranding && (
                    <div className="mt-4 border-t pt-4 text-center text-xs text-gray-400 dark:border-gray-900 dark:text-white">
                      <a href="https://cal.com/signup">{t("create_booking_link_with_calcom")}</a>
                    </div>
                  )}
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  ) : null;
};

export default PaymentPage;
