import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import stripejs, { StripeCardElementChangeEvent, StripeElementLocale } from "@stripe/stripe-js";
import { useRouter } from "next/router";
import { stringify } from "querystring";
import React, { SyntheticEvent, useEffect, useState } from "react";

import { PaymentData } from "@ee/lib/stripe/server";

import { useLocale } from "@lib/hooks/useLocale";

import Button from "@components/ui/Button";

const CARD_OPTIONS: stripejs.StripeCardElementOptions = {
  iconStyle: "solid" as const,
  classes: {
    base: "block p-2 w-full border-solid border-2 border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-black focus-within:ring-black focus-within:border-black sm:text-sm",
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
  payment: {
    data: PaymentData;
  };
  eventType: { id: number };
  user: { username: string | null };
  location?: string | null;
};

type States =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "error"; error: Error }
  | { status: "ok" };

export default function PaymentComponent(props: Props) {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const { name, date } = router.query;
  const [state, setState] = useState<States>({ status: "idle" });
  const stripe = useStripe();
  const elements = useElements();

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

    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setState({ status: "processing" });
    const payload = await stripe.confirmCardPayment(props.payment.data.client_secret!, {
      payment_method: {
        card,
      },
    });
    if (payload.error) {
      setState({
        status: "error",
        error: new Error(`Payment failed: ${payload.error.message}`),
      });
    } else {
      const params: { [k: string]: any } = {
        date,
        type: props.eventType.id,
        user: props.user.username,
        name,
      };

      if (props.location) {
        if (props.location.includes("integration")) {
          params.location = t("web_conferencing_details_to_follow");
        } else {
          params.location = props.location;
        }
      }

      const query = stringify(params);
      const successUrl = `/success?${query}`;

      await router.push(successUrl);
    }
  };
  return (
    <form id="payment-form" className="mt-4" onSubmit={handleSubmit}>
      <CardElement id="card-element" options={CARD_OPTIONS} onChange={handleChange} />
      <div className="mt-2 flex justify-center">
        <Button
          type="submit"
          disabled={["processing", "error"].includes(state.status)}
          loading={state.status === "processing"}
          id="submit">
          <span id="button-text">
            {state.status === "processing" ? <div className="spinner" id="spinner" /> : t("pay_now")}
          </span>
        </Button>
      </div>
      {state.status === "error" && (
        <div className="mt-4 text-center text-gray-700 dark:text-gray-300" role="alert">
          {state.error.message}
        </div>
      )}
    </form>
  );
}
