"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Payment } from "@calcom/prisma/client";
import { Button } from "@calcom/ui/components/button";

interface PaystackPaymentData {
  access_code: string;
  authorization_url: string;
  publicKey: string;
  reference: string;
}

interface PaystackPaymentComponentProps {
  payment: Payment & {
    data: PaystackPaymentData;
  };
  clientId: string;
  bookingUid: string;
  bookingTitle: string;
  amount: number;
  currency: string;
}

export default function PaystackPaymentComponent({
  payment,
  bookingUid,
  bookingTitle,
  amount,
  currency,
}: PaystackPaymentComponentProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { t } = useLocale();

  const paymentData = payment.data as unknown as PaystackPaymentData;

  const formattedAmount = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const handlePayment = async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const PaystackPop = (await import("@paystack/inline-js")).default;
      const popup = new PaystackPop();

      popup.resumeTransaction(paymentData.access_code, {
        onSuccess: async () => {
          setStatus("success");

          // Backup verification — call our verify endpoint
          try {
            await fetch(
              `/api/integrations/paystack/verify?reference=${paymentData.reference}`
            );
          } catch {
            // Webhook will handle it if this fails
          }

          // Redirect to booking confirmation
          setTimeout(() => {
            window.location.href = `/booking/${bookingUid}`;
          }, 2000);
        },
        onCancel: () => {
          setStatus("idle");
        },
        onError: () => {
          setStatus("error");
          setErrorMessage(t("payment_failed_try_again"));
        },
      });
    } catch {
      setStatus("error");
      setErrorMessage(t("payment_failed_try_again"));
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6">
        <div className="text-success text-2xl font-bold">{t("payment_successful")}</div>
        <p className="text-default">{t("redirecting_to_booking_confirmation")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6">
      <h2 className="text-emphasis text-xl font-semibold">{bookingTitle}</h2>
      <p className="text-default text-lg">{formattedAmount}</p>

      {errorMessage && <p className="text-error text-sm">{errorMessage}</p>}

      <Button
        color="primary"
        onClick={handlePayment}
        loading={status === "loading"}
        disabled={status === "loading"}
        data-testid="paystack-pay-button">
        {t("pay_with_paystack")}
      </Button>

      {status === "idle" && (
        <p className="text-subtle text-xs">{t("paystack_payment_prompt")}</p>
      )}
    </div>
  );
}
