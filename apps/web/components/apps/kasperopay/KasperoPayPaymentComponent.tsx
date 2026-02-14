"use client";

import { useEffect, useState } from "react";
import z from "zod";

import { useBookingSuccessRedirect } from "@calcom/features/bookings/lib/bookingSuccessRedirect";
import type { PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Spinner } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface IKasperoPayPaymentComponentProps {
  payment: {
    data: unknown;
  };
  paymentPageProps: PaymentPageProps;
}

const PaymentKasperoDataSchema = z.object({
  session: z.object({
    token: z.string(),
    session_id: z.string(),
    amount_kas: z.number(),
    isPaid: z.boolean(),
    expires_at: z.string().optional(),
  }),
});

export const KasperoPayPaymentComponent = (props: IKasperoPayPaymentComponentProps) => {
  const { payment } = props;
  const { data } = payment;
  const [isPaying, setPaying] = useState(false);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedData = PaymentKasperoDataSchema.safeParse(data);
  if (!parsedData.success) {
    return <p className="mt-3 text-center">Could not load payment session</p>;
  }

  const session = parsedData.data.session;
  const KASPEROPAY_API = "https://kaspa-store.com";

  useEffect(() => {
    // Load KasperoPay widget script if not already loaded
    if (document.getElementById("kaspero-pay-script")) {
      setWidgetLoaded(true);
      return;
    }

    // Create the required widget container div
    if (!document.getElementById("kaspero-pay-button")) {
      const container = document.createElement("div");
      container.id = "kaspero-pay-button";
      container.style.display = "none";
      container.dataset.merchant = "kpm_calcom";
      document.body.appendChild(container);
    }

    const script = document.createElement("script");
    script.id = "kaspero-pay-script";
    script.src = `${KASPEROPAY_API}/pay/widget.js`;
    script.async = true;
    script.onload = () => setWidgetLoaded(true);
    script.onerror = () => setError("Failed to load payment widget");
    document.body.appendChild(script);
  }, []);

  const handlePay = async () => {
    setPaying(true);
    setError(null);

    try {
      if (window.KasperoPay && window.KasperoPay.isReady()) {
        window.KasperoPay.pay({
          amount: session.amount_kas,
          item: props.paymentPageProps.booking.title || "Booking Payment",
          sessionToken: session.token,
          sessionId: session.session_id,
          onPayment: (result: any) => {
            if (result.success) {
              showToast("Payment successful!", "success");
              // PaymentChecker polling will handle the redirect
            } else {
              setError(result.error || "Payment failed");
              setPaying(false);
            }
          },
          onCancel: () => {
            setPaying(false);
          },
        });
      } else {
        // Fallback: open payment page directly
        window.open(
          `${KASPEROPAY_API}/pay/session/${session.session_id}?token=${session.token}`,
          "_blank"
        );
      }
    } catch (err) {
      setError((err as Error).message || "Payment failed");
      setPaying(false);
    }
  };

  return (
    <div className="mb-4 mt-8 flex h-full w-full flex-col items-center justify-center gap-4">
      <PaymentChecker {...props.paymentPageProps} />

      {isPaying && (
        <div className="flex flex-col items-center gap-2">
          <Spinner className="mt-4 h-8 w-8" />
          <p className="text-sm text-subtle">Waiting for payment confirmation...</p>
        </div>
      )}

      {!isPaying && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm">Pay with any Kaspa wallet</p>
          <div className="flex gap-3">
            <Button
              onClick={handlePay}
              disabled={!widgetLoaded && !error}
              loading={!widgetLoaded && !error}
              color="primary">
              Pay {session.amount_kas} KAS
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center text-xs text-subtle">
        Powered by&nbsp;
        <a href="https://kaspa-store.com" target="_blank" rel="noopener noreferrer" className="underline">
          KasperoPay
        </a>
      </div>
    </div>
  );
};

// Same polling pattern as Alby - checks if booking got marked as paid
type PaymentCheckerProps = PaymentPageProps;

function PaymentChecker(props: PaymentCheckerProps) {
  const searchParams = useCompatSearchParams();
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  const utils = trpc.useUtils();
  const { t } = useLocale();

  useEffect(() => {
    if (searchParams === null) {
      return;
    }

    const sp = searchParams;

    const interval = setInterval(() => {
      (async () => {
        if (props.booking.status === "ACCEPTED") {
          return;
        }
        const { booking: bookingResult } = await utils.viewer.bookings.find.fetch({
          bookingUid: props.booking.uid,
        });

        if (bookingResult?.paid) {
          showToast("Payment successful", "success");

          const params: {
            uid: string;
            email: string | null;
            location: string;
          } = {
            uid: props.booking.uid,
            email: sp.get("email"),
            location: t("web_conferencing_details_to_follow"),
          };

          bookingSuccessRedirect({
            successRedirectUrl: props.eventType.successRedirectUrl,
            query: params,
            booking: props.booking,
            forwardParamsSuccessRedirect: props.eventType.forwardParamsSuccessRedirect,
          });
        }
      })();
    }, 1000);

    return () => clearInterval(interval);
  }, [
    bookingSuccessRedirect,
    props.booking,
    props.booking.id,
    props.booking.status,
    props.eventType.id,
    props.eventType.successRedirectUrl,
    props.eventType.forwardParamsSuccessRedirect,
    props.payment.success,
    searchParams,
    t,
    utils.viewer.bookings,
  ]);

  return null;
}
