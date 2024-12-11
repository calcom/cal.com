"use client";

import { AdyenCheckout, Dropin, Card, CashAppPay, GooglePay, PayPal } from "@adyen/adyen-web";
import type {
  PaymentFailedData,
  PaymentCompletedData,
  CoreConfiguration,
  DropinConfiguration,
  UIElement,
  AdyenCheckoutError,
} from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import z from "zod";

import type { PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

interface IAdyenPaymentComponentProps {
  payment: {
    data: unknown;
  };
  paymentPageProps: PaymentPageProps;
}

const adyenPaymentSessionDataSchema = z.object({
  sessionId: z.string(),
  sessionData: z.string(),
  clientKey: z.string(),
});

export const AdyenPaymentComponent = (props: IAdyenPaymentComponentProps) => {
  const { t } = useLocale();
  const dropinRef = useRef<HTMLDivElement>(null);
  const isAdyenWebInitialized = useRef<boolean>(false);
  const searchParams = useSearchParams();

  const loadAdyen = useCallback(async () => {
    const { payment } = props;
    const { data } = payment;
    const session = adyenPaymentSessionDataSchema.parse(data);

    const options: CoreConfiguration = {
      clientKey: session.clientKey,
      session: {
        id: session.sessionId,
        sessionData: session.sessionData,
      },
      environment: IS_PRODUCTION ? "live" : "test",
      analytics: {
        enabled: false,
      },
      onError(error: AdyenCheckoutError) {
        console.error("Something went wrong", error);
      },
      onPaymentCompleted(data: PaymentCompletedData, element: UIElement) {
        console.log(data, element);
      },
      onPaymentFailed(data: PaymentFailedData, element: UIElement) {
        console.log(data, element);
      },
    };

    const checkout = await AdyenCheckout(options);

    const dropinConfiguration: DropinConfiguration = {
      paymentMethodsConfiguration: {
        card: {
          _disableClickToPay: true,
        },
      },
      paymentMethodComponents: [Card, PayPal, CashAppPay, GooglePay],
    };

    if (dropinRef.current) {
      new Dropin(checkout, dropinConfiguration).mount(dropinRef.current);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAdyenWebInitialized.current) {
      isAdyenWebInitialized.current = true;
      void loadAdyen();
    }
  }, [loadAdyen]);

  return (
    <>
      <div className="flex w-full flex-col items-center justify-center">
        <div className="flex items-center justify-center">
          <p className="text-default">{t("pay_using")}</p>
          <img
            className="h-24 w-48"
            src="/api/app-store/adyen/DIGITAL-Adyen-green-RGB.svg"
            alt="Adyen Icon"
          />
        </div>
        <div ref={dropinRef} id="adyen-dropin" />
      </div>
    </>
  );
};
