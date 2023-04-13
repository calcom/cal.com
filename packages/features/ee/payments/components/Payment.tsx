import type { Payment } from "@prisma/client";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeCardElementChangeEvent, StripeElementLocale } from "@stripe/stripe-js";
import type stripejs from "@stripe/stripe-js";
import { useRouter } from "next/router";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";

import type { StripePaymentData, StripeSetupIntentData } from "@calcom/app-store/stripepayment/lib/server";
import { bookingSuccessRedirect } from "@calcom/lib/bookingSuccessRedirect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Checkbox } from "@calcom/ui";

import type { EventType } from ".prisma/client";

const CARD_OPTIONS: stripejs.StripeCardElementOptions = {
  iconStyle: "solid" as const,
  classes: {
    base: "block p-2 w-full border-solid border-2 border-default rounded-md dark:bg-black dark:text-inverted dark:border-black focus-within:ring-black focus-within:border-black text-sm",
  },
  style: {
    base: {
      color: "#666",
      iconColor: "#666",
      fontFamily: "ui-sans-serif, system-ui",
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#888888",
      },
    },
  },
} as const;

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

export default function PaymentComponent(props: Props) {
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

  const handleChange = async (event: StripeCardElementChangeEvent) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setState({ status: "idle" });
    if (event.error)
      setState({ status: "error", error: new Error(event.error?.message || t("missing_card_fields")) });
  };

  const handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();

    if (!stripe || !elements || !router.isReady) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setState({ status: "processing" });

    let payload;
    const params: { [k: string]: any } = {
      uid: props.bookingUid,
      email: router.query.email,
    };
    if (paymentOption === "HOLD" && "setupIntent" in props.payment.data) {
      const setupIntentData = props.payment.data as unknown as StripeSetupIntentData;
      payload = await stripe.confirmCardSetup(setupIntentData.setupIntent.client_secret!, {
        payment_method: {
          card,
        },
      });
    } else if (paymentOption === "ON_BOOKING") {
      const paymentData = props.payment.data as unknown as StripePaymentData;
      payload = await stripe.confirmCardPayment(paymentData.client_secret!, {
        payment_method: {
          card,
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
      <p className="font-semibold">{t("card_details")}</p>
      <CardElement
        className="my-5 bg-white p-2"
        id="card-element"
        options={CARD_OPTIONS}
        onChange={handleChange}
      />
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
          color="primary"
          type="submit"
          disabled={!holdAcknowledged || ["processing", "error"].includes(state.status)}
          loading={state.status === "processing"}
          id="submit"
          className="border-subtle border">
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
}
