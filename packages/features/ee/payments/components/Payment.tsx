"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementLocale, StripeElements, StripePaymentElementOptions } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { useBookingSuccessRedirect } from "@calcom/features/bookings/lib/bookingSuccessRedirect";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventType, Payment } from "@calcom/prisma/client";
import type { PaymentOption } from "@calcom/prisma/enums";
import { Button } from "@calcom/ui/components/button";
import { CheckboxField } from "@calcom/ui/components/form";

import type { PaymentPageProps } from "../pages/payment";

export type Props = {
  payment: Omit<Payment, "id" | "fee" | "success" | "refunded" | "externalId" | "data"> & {
    data: Record<string, unknown>;
  };
  eventType: {
    id: number;
    successRedirectUrl: EventType["successRedirectUrl"];
    forwardParamsSuccessRedirect: EventType["forwardParamsSuccessRedirect"];
  };
  user: {
    username: string | null;
  };
  location?: string | null;
  clientSecret: string;
  booking: PaymentPageProps["booking"];
};

export type States =
  | {
      status: "idle";
    }
  | {
      status: "processing";
    }
  | {
      status: "error";
      error: Error;
    }
  | {
      status: "ok";
    };

export const PaymentFormComponent = (
  props: Props & {
    onSubmit: (ev: SyntheticEvent) => void;
    onCancel: () => void;
    onPaymentElementChange: () => void;
    elements: StripeElements | null;
    paymentOption: PaymentOption | null;
    state: States;
  }
) => {
  const { t, i18n } = useLocale();
  const { paymentOption, elements, state, onPaymentElementChange } = props;
  const [isCanceling, setIsCanceling] = useState<boolean>(false);
  const [holdAcknowledged, setHoldAcknowledged] = useState<boolean>(paymentOption === "HOLD" ? false : true);
  const disableButtons = isCanceling || !holdAcknowledged || ["processing", "error"].includes(state.status);

  const paymentElementOptions = {
    layout: "accordion",
  } as StripePaymentElementOptions;

  useEffect(() => {
    elements?.update({ locale: i18n.language as StripeElementLocale });
  }, [elements, i18n.language]);

  return (
    <form id="payment-form" className="bg-subtle mt-4 rounded-md p-6" onSubmit={props.onSubmit}>
      <div>
        <PaymentElement options={paymentElementOptions} onChange={(_) => onPaymentElementChange()} />
      </div>
      {paymentOption === "HOLD" && (
        <div className="bg-info mb-5 mt-2 rounded-md p-3">
          <CheckboxField
            description={t("acknowledge_booking_no_show_fee", {
              amount: props.payment.amount / 100,
              formatParams: { amount: { currency: props.payment.currency } },
            })}
            onChange={(e) => setHoldAcknowledged(e.target.checked)}
            descriptionClassName="text-info font-semibold"
          />
        </div>
      )}
      <div className="mt-2 flex justify-end space-x-2">
        <Button
          color="minimal"
          disabled={disableButtons}
          id="cancel"
          type="button"
          loading={isCanceling}
          onClick={() => {
            setIsCanceling(true);
            props.onCancel();
          }}>
          <span id="button-text">{t("cancel")}</span>
        </Button>
        <Button
          type="submit"
          disabled={disableButtons}
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

const PaymentForm = (props: Props) => {
  const {
    user: { username },
  } = props;
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const [state, setState] = useState<States>({ status: "idle" });
  const stripe = useStripe();
  const elements = useElements();
  const paymentOption = props.payment.paymentOption;
  const bookingSuccessRedirect = useBookingSuccessRedirect();

  const handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();

    if (!stripe || !elements || searchParams === null) {
      return;
    }

    if (!stripe || !elements) {
      return;
    }

    setState({ status: "processing" });

    let payload;
    const params: {
      uid: string;
      email: string | null;
      location?: string;
      payment_intent?: string;
      payment_intent_client_secret?: string;
      redirect_status?: string;
    } = {
      uid: props.booking.uid,
      email: searchParams?.get("email"),
    };
    if (paymentOption === "HOLD" && "setupIntent" in props.payment.data) {
      payload = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (payload.setupIntent) {
        params.payment_intent = payload.setupIntent.id;
        params.payment_intent_client_secret = payload.setupIntent.client_secret || undefined;
        params.redirect_status = payload.setupIntent.status;
      }
    } else if (paymentOption === "ON_BOOKING") {
      payload = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${WEBAPP_URL}/booking/${params.uid}`,
        },
        redirect: "if_required",
      });
      if (payload.paymentIntent) {
        params.payment_intent = payload.paymentIntent.id;
        params.payment_intent_client_secret = payload.paymentIntent.client_secret || undefined;
        params.redirect_status = payload.paymentIntent.status;
      }
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
        successRedirectUrl: props.eventType.successRedirectUrl,
        query: params,
        booking: props.booking,
        forwardParamsSuccessRedirect: props.eventType.forwardParamsSuccessRedirect,
      });
    }
  };

  return (
    <PaymentFormComponent
      {...props}
      elements={elements}
      paymentOption={paymentOption}
      state={state}
      onSubmit={handleSubmit}
      onCancel={() => {
        if (username) {
          return router.push(`/${username}`);
        }
        return router.back();
      }}
      onPaymentElementChange={() => {
        setState({ status: "idle" });
      }}
    />
  );
};

export default function PaymentComponent(props: Props) {
  const stripePromise = getStripe(props.payment.data.stripe_publishable_key as any);
  const [theme, setTheme] = useState<"stripe" | "night">("stripe");

  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setTheme("night");
    }
  }, []);

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme,
        },
      }}>
      <PaymentForm {...props} />
    </Elements>
  );
}
