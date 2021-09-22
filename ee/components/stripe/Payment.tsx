import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useRouter } from "next/router";
import { stringify } from "querystring";
import React, { useState } from "react";

import { PaymentData } from "@ee/lib/stripe/server";

import useDarkMode from "@lib/core/browser/useDarkMode";

import Button from "@components/ui/Button";

const CARD_OPTIONS = {
  iconStyle: "solid" as const,
  classes: {
    base: "block p-2 w-full border-solid border-2 border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus-within:ring-black focus-within:border-black sm:text-sm",
  },
  style: {
    base: {
      color: "#000",
      iconColor: "#000",
      fontFamily: "ui-sans-serif, system-ui",
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#888888",
      },
    },
  },
};

type Props = {
  payment: {
    data: PaymentData;
  };
  eventType: { id: number };
  user: { username: string | null };
};

type States =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "error"; error: Error }
  | { status: "ok" };

export default function PaymentComponent(props: Props) {
  const router = useRouter();
  const { name, date } = router.query;
  const [state, setState] = useState<States>({ status: "idle" });
  const stripe = useStripe();
  const elements = useElements();
  const { isDarkMode } = useDarkMode();

  if (isDarkMode) {
    CARD_OPTIONS.style.base.color = "#fff";
    CARD_OPTIONS.style.base.iconColor = "#fff";
    CARD_OPTIONS.style.base["::placeholder"].color = "#fff";
  }

  const handleChange = async (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setState({ status: "idle" });
    if (event.emtpy || event.error)
      setState({ status: "error", error: new Error(event.error?.message || "Missing card fields") });
  };
  const handleSubmit = async (ev) => {
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

      if (payload["location"]) {
        if (payload["location"].includes("integration")) {
          params.location = "Web conferencing details to follow.";
        } else {
          params.location = payload["location"];
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
      <div className="flex mt-2 justify-center">
        <Button
          type="submit"
          disabled={["processing", "error"].includes(state.status)}
          loading={state.status === "processing"}
          id="submit">
          <span id="button-text">
            {state.status === "processing" ? <div className="spinner" id="spinner" /> : "Pay now"}
          </span>
        </Button>
      </div>
      {state.status === "error" && (
        <div className="mt-4 text-gray-700 dark:text-gray-300 text-center" role="alert">
          {state.error.message}
        </div>
      )}
    </form>
  );
}
