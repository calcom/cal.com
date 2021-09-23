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

import useTheme from "@lib/hooks/useTheme";

dayjs.extend(utc);
dayjs.extend(toArray);
dayjs.extend(timezone);

const PaymentPage: FC<PaymentPageProps> = (props) => {
  const [is24h, setIs24h] = useState(false);
  const [date, setDate] = useState(dayjs.utc(props.booking.startTime));
  const { isReady } = useTheme(props.profile.theme);

  useEffect(() => {
    setDate(date.tz(localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()));
    setIs24h(!!localStorage.getItem("timeOption.is24hClock"));
  }, []);

  const eventName = props.booking.title;

  return isReady ? (
    <div className="bg-neutral-50 dark:bg-neutral-900 h-screen">
      <Head>
        <title>Payment | {eventName} | Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="max-w-3xl mx-auto py-24">
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 sm:my-0 transition-opacity" aria-hidden="true">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block align-bottom dark:bg-gray-800 bg-white rounded-sm px-8 pt-5 pb-4 text-left overflow-hidden border border-neutral-200 dark:border-neutral-700 transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:py-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <CreditCardIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3
                      className="text-2xl leading-6 font-semibold dark:text-white text-neutral-900"
                      id="modal-headline">
                      Payment
                    </h3>
                    <div className="mt-3">
                      <p className="text-sm text-neutral-600 dark:text-gray-300">
                        You have also received an email with this link, if you want to pay later.
                      </p>
                    </div>
                    <div className="mt-4 text-gray-700 dark:text-gray-300 border-t border-b dark:border-gray-900 py-4 grid grid-cols-3 text-left">
                      <div className="font-medium">What</div>
                      <div className="mb-6 col-span-2">{eventName}</div>
                      <div className="font-medium">When</div>
                      <div className="mb-6 col-span-2">
                        {date.format("dddd, DD MMMM YYYY")}
                        <br />
                        {date.format(is24h ? "H:mm" : "h:mma")} - {props.eventType.length} mins{" "}
                        <span className="text-gray-500">
                          ({localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()})
                        </span>
                      </div>
                      {props.booking.location && (
                        <>
                          <div className="font-medium">Where</div>
                          <div className="col-span-2">{location}</div>
                        </>
                      )}
                      <div className="font-medium">Price</div>
                      <div className="mb-6 col-span-2">
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
                    <div className="mt-4 text-gray-700 dark:text-gray-300 text-center">Paid</div>
                  )}
                  {!props.payment.success && (
                    <Elements stripe={getStripe(props.payment.data.stripe_publishable_key)}>
                      <PaymentComponent
                        payment={props.payment}
                        eventType={props.eventType}
                        user={props.user}
                      />
                    </Elements>
                  )}
                  {props.payment.refunded && (
                    <div className="mt-4 text-gray-700 dark:text-gray-300 text-center">Refunded</div>
                  )}
                </div>
                {!props.profile.hideBranding && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-900  text-gray-400 text-center text-xs dark:text-white">
                    <a href="https://cal.com/signup">Create your own booking link with Cal.com</a>
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
