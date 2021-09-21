import React, { useState } from "react";
import { stringify } from "querystring";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Button from "@components/ui/Button";
import { useRouter } from "next/router";
import useDarkMode from "@lib/core/browser/useDarkMode";
import { PaymentData } from "@ee/lib/stripe/server";
import { Prisma } from ".prisma/client";

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

const eventTypeData = Prisma.validator<Prisma.EventTypeArgs>()({ select: { id: true } });
type EventType = Prisma.EventTypeGetPayload<typeof eventTypeData>;

const userData = Prisma.validator<Prisma.UserArgs>()({ select: { username: true } });
type User = Prisma.UserGetPayload<typeof userData>;

type Props = {
  payment: {
    data: PaymentData;
  };
  eventType: EventType;
  user: User;
};

export default function PaymentComponent(props: Props) {
  const router = useRouter();
  const { name, date } = router.query;
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [disabled, setDisabled] = useState(true);
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
    setDisabled(event.empty);
    setError(event.error ? event.error.message : "");
  };
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setProcessing(true);
    const payload = await stripe.confirmCardPayment(props.payment.data.client_secret!, {
      payment_method: {
        card,
      },
    });
    if (payload.error) {
      setError(`Payment failed: ${payload.error.message}`);
      setProcessing(false);
    } else {
      setError(null);

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
        <Button type="submit" disabled={!!processing || disabled} loading={processing} id="submit">
          <span id="button-text">{processing ? <div className="spinner" id="spinner" /> : "Pay now"}</span>
        </Button>
      </div>
      {error && (
        <div className="mt-4 text-gray-700 dark:text-gray-300 text-center" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}
