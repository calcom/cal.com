"use client";

import { useBookingSuccessRedirect } from "@calcom/features/bookings/lib/bookingSuccessRedirect";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Spinner } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect, useState } from "react";
import z from "zod";

type PaymentPageProps = {
  payment: {
    id: number;
    success: boolean;
    refunded: boolean;
    amount: number;
    currency: string;
    paymentOption: string | null;
    data: Record<string, unknown>;
  };
  clientSecret?: string | null;
  booking: {
    id: number;
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    paid: boolean;
    description?: string | null;
    location?: string | null;
    attendees?: Array<{ name: string; email: string; timeZone: string }>;
    user?: { name: string | null; timeZone: string } | null;
    responses?: Record<string, unknown>;
  };
  eventType: {
    id: number;
    title: string;
    length: number;
    price: number;
    currency: string;
    metadata: Record<string, unknown> | null;
    successRedirectUrl?: string | null;
    forwardParamsSuccessRedirect?: boolean | null;
    recurringEvent?: unknown;
  };
};

interface IPaymentComponentProps {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
  paymentPageProps: PaymentPageProps;
}

// Create zod schema for data
const PaymentBTCPayDataSchema = z.object({
  invoice: z.object({ checkoutLink: z.string() }).required(),
});

export const BtcpayPaymentComponent = (props: IPaymentComponentProps) => {
  const { payment } = props;
  const { data } = payment;
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const { copyToClipboard, isCopied } = useCopy();
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  const parsedData = PaymentBTCPayDataSchema.safeParse(data);
  if (!parsedData.success || !parsedData.data?.invoice?.checkoutLink) return wrongUrl;
  const checkoutUrl = parsedData.data.invoice.checkoutLink;
  const handleOpenInNewTab = () => {
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-8 mb-4 flex h-full w-full flex-col items-center justify-center gap-4">
      <PaymentChecker {...props.paymentPageProps} />

      {!iframeLoaded && (
        <div className="flex items-center justify-center">
          <Spinner className="mr-2 h-5 w-5" />
          <p>Loading payment page...</p>
        </div>
      )}

      <div className={`w-full ${iframeLoaded ? "block" : "hidden"}`}>
        <iframe
          src={checkoutUrl}
          title="BTCPay Payment"
          className="h-[1000px] w-full rounded-md border-0"
          onLoad={() => setIframeLoaded(true)}
        />
      </div>

      <div className="flex flex-row flex-wrap items-center justify-center gap-4">
        <Button
          size="sm"
          color="secondary"
          onClick={() => copyToClipboard(checkoutUrl)}
          className="rounded-md text-subtle"
          StartIcon={isCopied ? "clipboard-check" : "clipboard"}>
          Copy Payment Link
        </Button>

        <Button onClick={handleOpenInNewTab}>Open in New Tab</Button>
      </div>
    </div>
  );
};

type PaymentCheckerProps = PaymentPageProps;

function PaymentChecker(props: PaymentCheckerProps) {
  // TODO: move booking success code to a common lib function
  // TODO: subscribe rather than polling
  const searchParams = useCompatSearchParams();
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  const utils = trpc.useUtils();
  const { t } = useLocale();

  useEffect(() => {
    if (searchParams === null) {
      return;
    }

    // use closure to ensure non-nullability
    const sp = searchParams;
    const interval = setInterval(() => {
      (async () => {
        try {
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
              successRedirectUrl: props.eventType.successRedirectUrl ?? null,
              query: params,
              booking: {
                ...props.booking,
                startTime: new Date(props.booking.startTime),
                endTime: new Date(props.booking.endTime),
                user: props.booking.user
                  ? { ...props.booking.user, email: null }
                  : { email: null, name: null },
                responses: undefined,
                attendees: undefined,
                location: props.booking.location ?? null,
                description: props.booking.description ?? null,
              },
              forwardParamsSuccessRedirect: props.eventType.forwardParamsSuccessRedirect ?? null,
            });
          }
        } catch (_e) {}
      })();
    }, 2000);

    return () => clearInterval(interval);
  }, [
    bookingSuccessRedirect,
    props.booking,
    props.booking.id,
    props.booking.status,
    props.eventType.successRedirectUrl,
    props.eventType.forwardParamsSuccessRedirect,
    searchParams,
    t,
    utils.viewer.bookings,
  ]);

  return null;
}
