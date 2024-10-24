import type { CoreConfiguration } from "@adyen/adyen-web/auto";
import { AdyenCheckout, Dropin } from "@adyen/adyen-web/auto";
import "@adyen/adyen-web/styles/adyen.css";
import { useEffect, useRef, useState } from "react";
import z from "zod";

import type { PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { useBookingSuccessRedirect } from "@calcom/lib/bookingSuccessRedirect";
import { Select } from "@calcom/ui";
import { Spinner } from "@calcom/ui/components/icon/Spinner";

import type { CountryCode } from "../lib/constants";
import { IS_LIVE, supportedCountries } from "../lib/constants";
import { adyenPaymentDataSchema, adyenSession } from "../zod";

interface IAdyenPaymentComponentProps {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
  paymentPageProps: PaymentPageProps;
}

// Create zod schema for data
const PaymentAdyenDataSchema = z.object({
  uid: z.string(),
  amount: z.number(),
  currency: z.string(),
  data: adyenPaymentDataSchema,
});

const wrongUrl = (
  <>
    <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
  </>
);

export const AdyenPaymentComponent = (props: IAdyenPaymentComponentProps) => {
  const { payment, paymentPageProps } = props;
  const parsedPayment = PaymentAdyenDataSchema.safeParse(payment);

  const dropInContainerRef = useRef<HTMLDivElement>(null);
  const [countryCode, setCountryCode] = useState<{ value: CountryCode; label: string }>();
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const bookingSuccessRedirect = useBookingSuccessRedirect();

  useEffect(() => {
    const updateSession = async () => {
      if (!parsedPayment.success) return;
      setIsLoadingSession(true);
      let currentSession;
      let clientKey;
      try {
        const response = await fetch("/api/integrations/adyen/updateSession", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentUid: parsedPayment.data.uid,
            bookingId: paymentPageProps.booking.id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update session");
        }

        const data = await response.json();
        const sessionParse = adyenSession.safeParse(data.session);
        if (!sessionParse.success) throw `Malformed session: ${sessionParse.error.flatten}`;
        currentSession = sessionParse.data;
        clientKey = data.clientKey;
      } catch (error) {
        console.error("Error updating session:", error);
      }
      const dropInElem = dropInContainerRef.current;
      if (currentSession && clientKey && dropInElem && countryCode) {
        const configuration = {
          clientKey: clientKey,
          environment: IS_LIVE ? "live" : "test",
          amount: currentSession.amount,
          //newLocale seems to be unlisted, but was found as a value during live testing
          locale: (props.paymentPageProps as any)?.newLocale ?? "en",
          countryCode: countryCode.value,
          session: currentSession,
          onPaymentCompleted: () => {
            bookingSuccessRedirect({
              successRedirectUrl: paymentPageProps.eventType.successRedirectUrl,
              query: {},
              booking: paymentPageProps.booking,
              forwardParamsSuccessRedirect: paymentPageProps.eventType.forwardParamsSuccessRedirect,
            });
          },
          onPaymentFailed: (result) => {
            console.error(result);
          },
          onError: (error) => {
            console.error(error.name, error.message, error.stack);
          },
        } satisfies CoreConfiguration;
        AdyenCheckout(configuration).then((e) => {
          new Dropin(e).mount(dropInElem);
          setIsLoadingSession(false);
        });
      }
    };

    if (countryCode) {
      updateSession();
    }
  }, [countryCode]);

  if (!parsedPayment.success) {
    return wrongUrl;
  }

  return (
    <div className="my-4 flex h-full w-full flex-col items-start justify-center gap-4">
      <div className="mt-5 w-60">
        <label className="text-default mb-1 block text-sm font-medium">Country of payment</label>
        <Select
          data-testid="adyen-country-code"
          variant="default"
          options={supportedCountries}
          value={countryCode}
          className="w-full text-black"
          defaultValue={countryCode}
          onChange={(e) => {
            if (e) {
              setCountryCode(e);
            }
          }}
        />
      </div>
      {isLoadingSession && <Spinner className="mx-auto my-4 h-8 w-8" />}
      <div
        id="dropin-container"
        className={`w-full ${isLoadingSession ? "hidden" : ""}`}
        ref={dropInContainerRef}
      />
    </div>
  );
};
