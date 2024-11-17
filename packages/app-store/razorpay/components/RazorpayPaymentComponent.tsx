import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  handler: (response: RazorpayResponse) => void;
}

export const RazorpayPaymentComponent = (props: {
  payment: {
    data: Record<string, unknown>;
  };
  onPaymentSuccess: (data: unknown) => void;
}) => {
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setIsLoading(false);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = (e: React.MouseEvent<HTMLButtonElement>) => {
    const options: RazorpayOptions = {
      key: props.payment.data.key_id as string,
      amount: props.payment.data.amount as number,
      currency: props.payment.data.currency as string,
      name: "Cal.com",
      description: "Booking Payment",
      handler: function (response: RazorpayResponse) {
        props.onPaymentSuccess(response);
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  if (isLoading) {
    return <div>{t("loading")}</div>;
  }

  return (
    <Button onClick={handlePayment} loading={isLoading}>
      {t("pay_now")}
    </Button>
  );
};
