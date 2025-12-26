"use client";

import type { EventType, Payment } from "@prisma/client";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementLocale, StripeElements, StripePaymentElementOptions } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { useBookingSuccessRedirect } from "@calcom/lib/bookingSuccessRedirect";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
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

type FormComponentProps = Props & {
  onSubmit: (ev: SyntheticEvent) => void;
  onCancel: () => void;
  onPaymentElementChange: () => void;
  elements: StripeElements | null;
  paymentOption: PaymentOption | null;
  state: States;
};

class PaymentFormState {
  private cancelInProgress = false;
  private holdConfirmed: boolean;

  constructor(paymentOption: PaymentOption | null) {
    this.holdConfirmed = paymentOption !== "HOLD";
  }

  get isCanceling() {
    return this.cancelInProgress;
  }

  get isHoldAcknowledged() {
    return this.holdConfirmed;
  }

  startCancellation() {
    this.cancelInProgress = true;
  }

  acknowledgeHold(acknowledged: boolean) {
    this.holdConfirmed = acknowledged;
  }

  shouldDisableButtons(processingState: States["status"]) {
    return this.cancelInProgress || !this.holdConfirmed || ["processing", "error"].includes(processingState);
  }
}

function usePaymentElementLocale(elements: StripeElements | null, language: string) {
  useEffect(() => {
    if (elements) {
      elements.update({ locale: language as StripeElementLocale });
    }
  }, [elements, language]);
}

function buildPaymentElementConfig(): StripePaymentElementOptions {
  return {
    layout: "accordion",
  };
}

export const PaymentFormComponent = (props: FormComponentProps) => {
  const { t, i18n } = useLocale();
  const { paymentOption, elements, state, onPaymentElementChange } = props;
  const [formState] = useState(() => new PaymentFormState(paymentOption));
  const [isCanceling, setIsCanceling] = useState(false);
  const [holdAcknowledged, setHoldAcknowledged] = useState(paymentOption !== "HOLD");

  usePaymentElementLocale(elements, i18n.language);

  const buttonsDisabled = formState.shouldDisableButtons(state.status);
  const elementConfig = buildPaymentElementConfig();

  const handleHoldAcknowledgement = (checked: boolean) => {
    formState.acknowledgeHold(checked);
    setHoldAcknowledged(checked);
  };

  const handleCancellation = () => {
    formState.startCancellation();
    setIsCanceling(true);
    props.onCancel();
  };

  const renderSubmitButtonText = () => {
    if (state.status === "processing") {
      return <div className="spinner" id="spinner" />;
    }
    return paymentOption === "HOLD" ? t("submit_card") : t("pay_now");
  };

  const renderHoldAcknowledgement = () => {
    if (paymentOption !== "HOLD") return null;

    return (
      <div className="bg-info mb-5 mt-2 rounded-md p-3">
        <CheckboxField
          description={t("acknowledge_booking_no_show_fee", {
            amount: props.payment.amount / 100,
            formatParams: { amount: { currency: props.payment.currency } },
          })}
          onChange={(e) => handleHoldAcknowledgement(e.target.checked)}
          descriptionClassName="text-info font-semibold"
        />
      </div>
    );
  };

  const renderErrorMessage = () => {
    if (state.status !== "error") return null;

    return (
      <div className="mt-4 text-center text-red-900 dark:text-gray-300" role="alert">
        {state.error.message}
      </div>
    );
  };

  return (
    <form id="payment-form" className="bg-subtle mt-4 rounded-md p-6" onSubmit={props.onSubmit}>
      <div>
        <PaymentElement options={elementConfig} onChange={onPaymentElementChange} />
      </div>

      {renderHoldAcknowledgement()}

      <div className="mt-2 flex justify-end space-x-2">
        <Button
          color="minimal"
          disabled={buttonsDisabled}
          id="cancel"
          type="button"
          loading={isCanceling}
          onClick={handleCancellation}>
          <span id="button-text">{t("cancel")}</span>
        </Button>
        <Button
          type="submit"
          disabled={buttonsDisabled}
          loading={state.status === "processing"}
          id="submit"
          color="secondary">
          <span id="button-text">{renderSubmitButtonText()}</span>
        </Button>
      </div>

      {renderErrorMessage()}
    </form>
  );
};

class StripePaymentProcessor {
  constructor(
    private stripe: ReturnType<typeof useStripe>,
    private elements: ReturnType<typeof useElements>
  ) {}

  private canProcess(): boolean {
    return !!(this.stripe && this.elements);
  }

  async processHoldPayment() {
    if (!this.canProcess() || !this.elements) {
      return null;
    }

    return this.stripe!.confirmSetup({
      elements: this.elements,
      redirect: "if_required",
    });
  }

  async processImmediatePayment(bookingUid: string) {
    if (!this.canProcess() || !this.elements) {
      return null;
    }

    return this.stripe!.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: `${WEBAPP_URL}/booking/${bookingUid}`,
      },
      redirect: "if_required",
    });
  }

  extractSetupIntentParams(payload: Awaited<ReturnType<typeof this.processHoldPayment>>) {
    if (!payload?.setupIntent) return {};

    return {
      payment_intent: payload.setupIntent.id,
      payment_intent_client_secret: payload.setupIntent.client_secret || undefined,
      redirect_status: payload.setupIntent.status,
    };
  }

  extractPaymentIntentParams(payload: Awaited<ReturnType<typeof this.processImmediatePayment>>) {
    if (!payload?.paymentIntent) return {};

    return {
      payment_intent: payload.paymentIntent.id,
      payment_intent_client_secret: payload.paymentIntent.client_secret || undefined,
      redirect_status: payload.paymentIntent.status,
    };
  }

  hasPaymentError(
    payload: Awaited<ReturnType<typeof this.processHoldPayment | typeof this.processImmediatePayment>>
  ): boolean {
    return !!(payload && "error" in payload && payload.error);
  }

  getErrorMessage(
    payload: Awaited<ReturnType<typeof this.processHoldPayment | typeof this.processImmediatePayment>>
  ): string {
    if (payload && "error" in payload && payload.error) {
      return `Payment failed: ${payload.error.message}`;
    }
    return "Unknown payment error";
  }
}

class PaymentRedirectBuilder {
  constructor(
    private t: (key: string) => string,
    private bookingSuccessRedirect: ReturnType<typeof useBookingSuccessRedirect>
  ) {}

  private buildBaseParams(bookingUid: string, email: string | null) {
    return {
      uid: bookingUid,
      email,
    };
  }

  private resolveLocationParam(location: string | null | undefined): string | undefined {
    if (!location) return undefined;

    return location.includes("integration") ? this.t("web_conferencing_details_to_follow") : location;
  }

  async redirectToSuccess(
    booking: Props["booking"],
    eventType: Props["eventType"],
    email: string | null,
    location: string | null | undefined,
    paymentParams: Record<string, any>
  ) {
    const baseParams = this.buildBaseParams(booking.uid, email);
    const locationParam = this.resolveLocationParam(location);

    const fullParams = {
      ...baseParams,
      ...paymentParams,
      ...(locationParam && { location: locationParam }),
    };

    return this.bookingSuccessRedirect({
      successRedirectUrl: eventType.successRedirectUrl,
      query: fullParams,
      booking,
      forwardParamsSuccessRedirect: eventType.forwardParamsSuccessRedirect,
    });
  }
}

const PaymentForm = (props: Props) => {
  const { user } = props;
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const [state, setState] = useState<States>({ status: "idle" });
  const stripe = useStripe();
  const elements = useElements();
  const bookingSuccessRedirect = useBookingSuccessRedirect();

  const processor = new StripePaymentProcessor(stripe, elements);
  const redirectBuilder = new PaymentRedirectBuilder(t, bookingSuccessRedirect);

  const handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();

    if (!stripe || !elements || !searchParams) {
      return;
    }

    setState({ status: "processing" });

    try {
      const result = await processPaymentByOption(
        props.payment.paymentOption,
        processor,
        props.booking.uid,
        props.payment.data
      );

      if (!result) {
        setState({ status: "idle" });
        return;
      }

      if (processor.hasPaymentError(result.payload)) {
        setState({
          status: "error",
          error: new Error(processor.getErrorMessage(result.payload)),
        });
        return;
      }

      await redirectBuilder.redirectToSuccess(
        props.booking,
        props.eventType,
        searchParams.get("email"),
        props.location,
        result.params
      );
    } catch (error) {
      setState({
        status: "error",
        error: error instanceof Error ? error : new Error("Payment processing failed"),
      });
    }
  };

  const handleCancel = () => {
    if (user.username) {
      router.push(`/${user.username}`);
    } else {
      router.back();
    }
  };

  return (
    <PaymentFormComponent
      {...props}
      elements={elements}
      paymentOption={props.payment.paymentOption}
      state={state}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onPaymentElementChange={() => setState({ status: "idle" })}
    />
  );
};

async function processPaymentByOption(
  paymentOption: PaymentOption | null,
  processor: StripePaymentProcessor,
  bookingUid: string,
  paymentData: Record<string, unknown>
) {
  if (paymentOption === "HOLD" && "setupIntent" in paymentData) {
    const payload = await processor.processHoldPayment();
    const params = processor.extractSetupIntentParams(payload);
    return { payload, params };
  }

  if (paymentOption === "ON_BOOKING") {
    const payload = await processor.processImmediatePayment(bookingUid);
    const params = processor.extractPaymentIntentParams(payload);
    return { payload, params };
  }

  return null;
}

function useThemeDetection() {
  const [theme, setTheme] = useState<"stripe" | "night">("stripe");

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    if (isDarkMode) {
      setTheme("night");
    }
  }, []);

  return theme;
}

export const StripePaymentComponent = (props: Props) => {
  const stripePromise = getStripe(props.payment.data.stripe_publishable_key as any);
  const theme = useThemeDetection();

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: { theme },
      }}>
      <PaymentForm {...props} />
    </Elements>
  );
};
