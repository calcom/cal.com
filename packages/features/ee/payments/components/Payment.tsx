import type { Payment } from "@prisma/client";
import type { EventType } from "@prisma/client";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementLocale } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { getBookingRedirectExtraParams, useBookingSuccessRedirect } from "@calcom/lib/bookingSuccessRedirect";
import { CAL_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, CheckboxField } from "@calcom/ui";

import type { PaymentPageProps } from "../pages/payment";

type Props = {
  payment: Omit<Payment, "id" | "fee" | "success" | "refunded" | "externalId" | "data"> & {
    data: Record<string, unknown>;
  };
  eventType: {
    id: number;
    successRedirectUrl: EventType["successRedirectUrl"];
  };
  user: {
    username: string | null;
  };
  location?: string | null;
  clientSecret: string;
  booking: PaymentPageProps["booking"];
};

type States =
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

const getReturnUrl = (props: Props) => {
  if (!props.eventType.successRedirectUrl) {
    return `${CAL_URL}/booking/${props.booking.uid}`;
  }

  const returnUrl = new URL(props.eventType.successRedirectUrl);
  const queryParams = getBookingRedirectExtraParams(props.booking);

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    returnUrl.searchParams.append(key, String(value));
  });

  return returnUrl.toString();
};

const PaymentForm = (props: Props) => {
  const {
    user: { username },
  } = props;
  const { t, i18n } = useLocale();
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const [state, setState] = useState<States>({ status: "idle" });
  const [isCanceling, setIsCanceling] = useState<boolean>(false);
  const stripe = useStripe();
  const elements = useElements();
  const paymentOption = props.payment.paymentOption;
  const [holdAcknowledged, setHoldAcknowledged] = useState<boolean>(paymentOption === "HOLD" ? false : true);
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  useEffect(() => {
    elements?.update({ locale: i18n.language as StripeElementLocale });
  }, [elements, i18n.language]);

  const handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();

    if (!stripe || !elements || searchParams === null) {
      return;
    }

    setState({ status: "processing" });

    let payload;
    const params: {
      uid: string;
      email: string | null;
      location?: string;
    } = {
      uid: props.booking.uid,
      email: searchParams?.get("email"),
    };
    if (paymentOption === "HOLD" && "setupIntent" in props.payment.data) {
      payload = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: getReturnUrl(props),
        },
      });
    } else if (paymentOption === "ON_BOOKING") {
      payload = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: getReturnUrl(props),
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
        successRedirectUrl: props.eventType.successRedirectUrl,
        query: params,
        booking: props.booking,
      });
    }
  };

  const disableButtons = isCanceling || !holdAcknowledged || ["processing", "error"].includes(state.status);

  return (
    <form id="payment-form" className="bg-subtle mt-4 rounded-md p-6" onSubmit={handleSubmit}>
      <div>
        <PaymentElement onChange={() => setState({ status: "idle" })} />
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
            if (username) {
              return router.push(`/${username}`);
            }
            return router.back();
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
