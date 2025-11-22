"use client";

import { useEffect, useState } from "react";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

interface IRazorpayPaymentComponentProps {
  payment: {
    uid: string;
    data: unknown;
    amount: number;
    currency: string;
  };
}
const RazorpayPaymentDataSchema = z.object({
  orderId: z.string(),
  keyId: z.string(),
  amount: z.number(),
  currency: z.string(),
});

export const RazorpayPaymentComponent = (props: IRazorpayPaymentComponentProps) => {
  const { t } = useLocale();
  const { payment } = props;
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  const parsedData = RazorpayPaymentDataSchema.safeParse(payment.data);

  if (!parsedData.success) {
    return <p className="mt-3 text-center">{t("Payment data error")}</p>;
  }
  const { orderId, keyId, amount, currency } = parsedData.data;
  const handlePayment = () => {
    const options = {
      key: keyId,
      amount: amount,
      currency: currency,
      order_id: orderId,
      name: "Cal.com",
      description: t("Event Booking Payment"),
      handler: function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        fetch("/api/integrations/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            paymentUid: payment.uid,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.bookingUid) {
              window.location.href = `/booking/${data.bookingUid}`;
            } else {
              window.location.reload();
            }
          })
          .catch((error) => {
            console.error("Payment verification failed:", error);
            window.location.reload();
          });
      },
      prefill: {
        email: new URLSearchParams(window.location.search).get("email") || "",
        name: new URLSearchParams(window.location.search).get("name") || "",
      },
      theme: {
        color: "#292929",
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };
  return (
    <div className="mt-4 flex w-full flex-col items-center justify-center">
      <Button onClick={handlePayment} className="w-full" disabled={!scriptLoaded}>
        {scriptLoaded
          ? `${t("pay_amount", {
              amount: new Intl.NumberFormat(window !== undefined ? window.navigator.language : "en", {
                style: "currency",
                currency: currency,
              }).format(amount / 100),
            })}`
          : t("Loading...")}
      </Button>
    </div>
  );
};
