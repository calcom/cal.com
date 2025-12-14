"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementLocale, StripeElements, StripePaymentElementOptions } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { useBookingSuccessRedirect } from "@calcom/features/bookings/lib/bookingSuccessRedirect";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { formatPrice } from "@calcom/lib/currencyConversions";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { CalPromotionData } from "@calcom/lib/payment/promoCode";
import { getCalPromotionFromPaymentData, getStripePublishableKey } from "@calcom/lib/payment/promoCode";
import type { EventType, Payment } from "@calcom/prisma/client";
import type { PaymentOption } from "@calcom/prisma/enums";
import { Button } from "@calcom/ui/components/button";
import { CheckboxField } from "@calcom/ui/components/form/checkbox/Checkbox";
import { TextField } from "@calcom/ui/components/form/inputs/TextField";

import type { PaymentPageProps } from "../pages/payment";

function getInitialPromotion(paymentData: Record<string, unknown>): CalPromotionData | null {
  return getCalPromotionFromPaymentData(paymentData);
}

type PromoCodeApiResponse = {
  payment: { uid: string; amount: number; currency: string };
  promotion: CalPromotionData | null;
};

type ApiErrorPayload = {
  message?: string;
  data?: {
    code?: string;
  } | null;
};

function hasFetchUpdates(
  elements: StripeElements
): elements is StripeElements & { fetchUpdates: () => Promise<void> } {
  const maybeFn = (elements as unknown as Record<string, unknown>)["fetchUpdates"];
  return typeof maybeFn === "function";
}

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
  allowPromotionCodes?: boolean;
  onPaymentAmountChange?: (amount: number, promotion: CalPromotionData | null) => void;
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
    promo: {
      enabled: boolean;
      promotion: CalPromotionData | null;
      inputValue: string;
      isBusy: boolean;
      error: string | null;
    };
    onPromoInputChange: (value: string) => void;
    onApplyPromoCode: () => void;
    onRemovePromoCode: () => void;
  }
) => {
  const { t, i18n } = useLocale();
  const { paymentOption, elements, state, onPaymentElementChange } = props;
  const [isCanceling, setIsCanceling] = useState<boolean>(false);
  const [holdAcknowledged, setHoldAcknowledged] = useState<boolean>(paymentOption === "HOLD" ? false : true);
  const disableButtons = isCanceling || !holdAcknowledged || ["processing", "error"].includes(state.status);
  const isFreeAfterPromo = paymentOption === "ON_BOOKING" && props.promo.promotion?.finalAmount === 0;

  const paymentElementOptions = {
    layout: "accordion",
  } as StripePaymentElementOptions;

  useEffect(() => {
    elements?.update({ locale: i18n.language as StripeElementLocale });
  }, [elements, i18n.language]);

  return (
    <form id="payment-form" className="bg-subtle mt-4 rounded-md p-6" onSubmit={props.onSubmit}>
      {!isFreeAfterPromo && (
        <div>
          <PaymentElement options={paymentElementOptions} onChange={(_) => onPaymentElementChange()} />
        </div>
      )}
      {props.promo.enabled && paymentOption === "ON_BOOKING" && (
        <div className="mt-4">
          <div className="text-default text-sm font-medium">{t("promo_code")}</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="grow">
              <TextField
                name="promo_code"
                labelSrOnly
                disabled={props.promo.isBusy || !!props.promo.promotion}
                value={props.promo.inputValue}
                onChange={(e) => props.onPromoInputChange(e.currentTarget.value)}
                placeholder={t("promo_code_placeholder")}
              />
            </div>
            {!props.promo.promotion ? (
              <Button
                type="button"
                color="secondary"
                loading={props.promo.isBusy}
                disabled={props.promo.isBusy || props.promo.inputValue.trim().length === 0}
                onClick={props.onApplyPromoCode}>
                {t("apply")}
              </Button>
            ) : (
              <Button
                type="button"
                color="destructive"
                loading={props.promo.isBusy}
                disabled={props.promo.isBusy}
                onClick={props.onRemovePromoCode}>
                {t("remove")}
              </Button>
            )}
          </div>
          {props.promo.promotion && (
            <div className="text-default border-subtle mt-2 rounded-md border p-3 text-sm">
              <div>
                {t("promo_code_applied", {
                  code: props.promo.promotion.code,
                })}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-subtle">{t("discount")}</div>
                <div className="text-error text-right font-medium">
                  -{formatPrice(props.promo.promotion.discountAmount, props.payment.currency, i18n.language)}
                </div>
                <div className="text-subtle">{t("total")}</div>
                <div className="text-right font-semibold">
                  {formatPrice(props.promo.promotion.finalAmount, props.payment.currency, i18n.language)}
                </div>
              </div>
            </div>
          )}
          {props.promo.error && (
            <div className="mt-2 text-sm text-red-900 dark:text-gray-300" role="alert">
              {props.promo.error}
            </div>
          )}
        </div>
      )}
      {paymentOption === "HOLD" && (
        <div className="bg-cal-info mb-5 mt-2 rounded-md p-3">
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
            ) : isFreeAfterPromo ? (
              t("confirm")
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

  const [promoInput, setPromoInput] = useState<string>("");
  const [promoIsBusy, setPromoIsBusy] = useState<boolean>(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<CalPromotionData | null>(() =>
    getInitialPromotion(props.payment.data)
  );

  const isFreeAfterPromo = paymentOption === "ON_BOOKING" && promotion?.finalAmount === 0;

  const promoEnabled =
    props.allowPromotionCodes === true &&
    paymentOption === "ON_BOOKING" &&
    typeof searchParams?.get("email") === "string";

  const mapPromoError = (payload: ApiErrorPayload): string => {
    const code = payload.data?.code;
    if (code === "invalid") return t("promo_code_invalid");
    if (code === "expired") return t("promo_code_expired");
    if (code === "not_active") return t("promo_code_not_active");
    if (code === "currency_mismatch") return t("promo_code_currency_mismatch");
    if (code === "free_payment") return t("promo_code_free_payment_not_supported");
    if (code === "not_enabled") return t("promo_code_not_enabled");
    if (code === "not_eligible") return t("promo_code_not_eligible");
    if (code === "unauthorized") return t("promo_code_unauthorized");
    if (code === "rate_limited") return t("promo_code_rate_limited");
    return payload.message || t("promo_code_error");
  };

  const applyPromoCode = async () => {
    if (!promoEnabled || !elements) return;
    const email = searchParams?.get("email");
    if (!email) {
      setPromoError(t("promo_code_missing_email"));
      return;
    }

    setPromoError(null);
    setPromoIsBusy(true);
    try {
      const res = await fetch("/api/payment/promo-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentUid: props.payment.uid,
          promoCode: promoInput,
          email,
        }),
      });

      const json = (await res.json()) as PromoCodeApiResponse | ApiErrorPayload;
      if (!res.ok) {
        setPromoError(mapPromoError(json as ApiErrorPayload));
        return;
      }
      const data = json as PromoCodeApiResponse;
      setPromotion(data.promotion);
      props.onPaymentAmountChange?.(data.payment.amount, data.promotion);
      if (hasFetchUpdates(elements)) {
        await elements.fetchUpdates();
      }
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : t("promo_code_error"));
    } finally {
      setPromoIsBusy(false);
    }
  };

  const removePromoCode = async () => {
    if (!promoEnabled || !elements) return;
    const email = searchParams?.get("email");
    if (!email) {
      setPromoError(t("promo_code_missing_email"));
      return;
    }

    setPromoError(null);
    setPromoIsBusy(true);
    try {
      const res = await fetch("/api/payment/promo-code", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentUid: props.payment.uid,
          email,
        }),
      });

      const json = (await res.json()) as PromoCodeApiResponse | ApiErrorPayload;
      if (!res.ok) {
        setPromoError(mapPromoError(json as ApiErrorPayload));
        return;
      }
      const data = json as PromoCodeApiResponse;
      setPromotion(null);
      setPromoInput("");
      props.onPaymentAmountChange?.(data.payment.amount, null);
      if (hasFetchUpdates(elements)) {
        await elements.fetchUpdates();
      }
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : t("promo_code_error"));
    } finally {
      setPromoIsBusy(false);
    }
  };

  const handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();

    if (searchParams === null) {
      return;
    }

    if (isFreeAfterPromo) {
      const email = searchParams?.get("email");
      if (!email) {
        setState({ status: "error", error: new Error(t("promo_code_missing_email")) });
        return;
      }

      setState({ status: "processing" });
      try {
        const res = await fetch("/api/payment/confirm-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentUid: props.payment.uid,
            email,
          }),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok) {
          throw new Error(json.message || t("something_went_wrong"));
        }

        const params: {
          uid: string;
          email: string | null;
          location?: string;
        } = {
          uid: props.booking.uid,
          email,
        };
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
      } catch (e) {
        setState({ status: "error", error: e instanceof Error ? e : new Error(t("something_went_wrong")) });
        return;
      }
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
      promo={{
        enabled: promoEnabled,
        promotion,
        inputValue: promoInput,
        isBusy: promoIsBusy,
        error: promoError,
      }}
      onPromoInputChange={(value) => {
        setPromoInput(value);
        setPromoError(null);
      }}
      onApplyPromoCode={applyPromoCode}
      onRemovePromoCode={removePromoCode}
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
  const stripePromise = getStripe(getStripePublishableKey(props.payment.data));
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
