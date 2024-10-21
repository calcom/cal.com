import { Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import type { Props, States } from "@calcom/features/ee/payments/components/Payment";
import { PaymentFormComponent } from "@calcom/features/ee/payments/components/Payment";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const StripePaymentComponent = (props: Props) => {
  const { t } = useLocale();
  const elements = useElements();
  const paymentOption = props.payment.paymentOption;
  const stripe = useStripe();

  const [state, setState] = useState<States>({ status: "idle" });

  return (
    <PaymentFormComponent
      {...props}
      elements={elements}
      paymentOption={paymentOption}
      state={state}
      onSubmit={async (ev: SyntheticEvent) => {
        ev.preventDefault();

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
          email: "rajiv@cal.com",
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
        }
      }}
      onCancel={() => {
        // show the pay to book button here or just go back
      }}
      onPaymentElementChange={() => {
        setState({ status: "idle" });
      }}
    />
  );
};

const StripePaymentForm = (props: Props & { uid: string }) => {
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
      <StripePaymentComponent {...props} />
    </Elements>
  );
};

export default StripePaymentForm;
