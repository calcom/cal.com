import type { Payment } from "@prisma/client";
import { useElements, useStripe, PaymentElement, Elements } from "@stripe/react-stripe-js";
import type stripejs from "@stripe/stripe-js";
import type { StripeElementLocale } from "@stripe/stripe-js";
import { useRouter } from "next/router";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import type { StripePaymentData, StripeSetupIntentData } from "@calcom/app-store/stripepayment/lib/server";
import { bookingSuccessRedirect } from "@calcom/lib/bookingSuccessRedirect";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Checkbox } from "@calcom/ui";

import type { EventType } from ".prisma/client";

type Props = {
  payment: Omit<Payment, "id" | "fee" | "success" | "refunded" | "externalId" | "data"> & {
    data: StripePaymentData | StripeSetupIntentData;
  };
  eventType: { id: number; successRedirectUrl: EventType["successRedirectUrl"] };
  user: { username: string | null };
  location?: string | null;
  bookingId: number;
  bookingUid: string;
};

type States =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "error"; error: Error }
  | { status: "ok" };

const PaymentForm = (props: Props) => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const [state, setState] = useState<States>({ status: "idle" });
  const stripe = useStripe();
  const elements = useElements();
  const paymentOption = props.payment.paymentOption;
  const [holdAcknowledged, setHoldAcknowledged] = useState<boolean>(paymentOption === "HOLD" ? false : true);

  useEffect(() => {
    elements?.update({ locale: i18n.language as StripeElementLocale });
  }, [elements, i18n.language]);

  const handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();

    if (!stripe || !elements || !router.isReady) return;
    setState({ status: "processing" });

    let payload;
    const params: { [k: string]: any } = {
      uid: props.bookingUid,
      email: router.query.email,
    };
    if (paymentOption === "HOLD" && "setupIntent" in props.payment.data) {
      payload = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: props.eventType.successRedirectUrl || `${CAL_URL}/booking/${props.bookingUid}`,
        },
      });
    } else if (paymentOption === "ON_BOOKING") {
      payload = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: props.eventType.successRedirectUrl || `${CAL_URL}/booking/${props.bookingUid}`,
        },
      });
    }
    if (payload?.error) {
      setState({
        status: "error",
        error: new Error(`Payment failed: ${payload.error.message}`),
      });
    } else {
      if (props.location) {
        if (props.location.includes("integration")) {
          params.location = t("web_conferencing_details_to_follow");
        } else {
          params.location = props.location;
        }
      }

      return bookingSuccessRedirect({
        router,
        successRedirectUrl: props.eventType.successRedirectUrl,
        query: params,
        bookingUid: props.bookingUid,
      });
    }
  };

  return (
    <form id="payment-form" className="bg-subtle mt-4 rounded-md p-6" onSubmit={handleSubmit}>
      <div>
        <PaymentElement onChange={() => setState({ status: "idle" })} />
      </div>
      {paymentOption === "HOLD" && (
        <div className="bg-info mt-2 mb-5 rounded-md p-3">
          <Checkbox
            description={t("acknowledge_booking_no_show_fee", {
              amount: props.payment.amount / 100,
              formatParams: { amount: { currency: props.payment.currency } },
            })}
            onChange={(e) => setHoldAcknowledged(e.target.checked)}
            descriptionClassName="text-blue-900 font-semibold"
          />
        </div>
      )}
      <div className="mt-2 flex justify-end space-x-2">
        <Button
          color="minimal"
          disabled={!holdAcknowledged || ["processing", "error"].includes(state.status)}
          id="cancel">
          <span id="button-text">{t("cancel")}</span>
        </Button>
        <Button
          type="submit"
          disabled={!holdAcknowledged || ["processing", "error"].includes(state.status)}
          loading={state.status === "processing"}
          id="submit"
          color="secondary">
          <span id="button-text">
            {state.status === "processing" ? (
              <div className="spinner" id="spinner" />
            ) : paymentOption === "HOLD" ? (
              t("submit_card")
            ) : (
              t("pay_now")
            )}
          </span>
        </Button>
      </div>
      {state.status === "error" && (
        <div className="mt-4 text-center text-red-900 dark:text-gray-300" role="alert">
          {state.error.message}
        </div>
      )}
    </form>
  );
};

const ELEMENT_STYLES: stripejs.Appearance = {
  theme: "none",
};

const ELEMENT_STYLES_DARK: stripejs.Appearance = {
  theme: "night",
  variables: {
    colorText: "#d6d6d6",
    fontWeightNormal: "600",
    borderRadius: "6px",
    colorBackground: "#101010",
    colorPrimary: "#d6d6d6",
  },
};

export default function PaymentComponent(props: Props) {
  const stripePromise = getStripe((props.payment.data as StripePaymentData).stripe_publishable_key);
  const paymentOption = props.payment.paymentOption;
  const [darkMode, setDarkMode] = useState<boolean>(false);
  let clientSecret: string | null;

  useEffect(() => {
    setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  if (paymentOption === "HOLD" && "setupIntent" in props.payment.data) {
    clientSecret = props.payment.data.setupIntent.client_secret;
  } else if (!("setupIntent" in props.payment.data)) {
    clientSecret = props.payment.data.client_secret;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: clientSecret!,
        appearance: darkMode ? ELEMENT_STYLES_DARK : ELEMENT_STYLES,
      }}>
      <PaymentForm {...props} />
    </Elements>
  );
}
