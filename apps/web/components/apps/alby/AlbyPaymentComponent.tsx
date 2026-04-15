"use client";

import { useBookingSuccessRedirect } from "@calcom/features/bookings/lib/bookingSuccessRedirect";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Spinner } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
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

interface IAlbyPaymentComponentProps {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
  paymentPageProps: PaymentPageProps;
}

// Create zod schema for data
const PaymentAlbyDataSchema = z.object({
  invoice: z
    .object({
      paymentRequest: z.string(),
    })
    .required(),
});

export const AlbyPaymentComponent = (props: IAlbyPaymentComponentProps) => {
  const { payment } = props;
  const { data } = payment;
  const [showQRCode, setShowQRCode] = useState(window.webln === undefined);
  const [isPaying, setPaying] = useState(false);
  const { copyToClipboard, isCopied } = useCopy();
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  const parsedData = PaymentAlbyDataSchema.safeParse(data);
  if (!parsedData.success || !parsedData.data?.invoice?.paymentRequest) {
    return wrongUrl;
  }
  const paymentRequest = parsedData.data.invoice.paymentRequest;

  return (
    <div className="mt-8 mb-4 flex h-full w-full flex-col items-center justify-center gap-4">
      <PaymentChecker {...props.paymentPageProps} />
      {isPaying && <Spinner className="mt-12 h-8 w-8" />}
      {!isPaying && (
        <>
          {!showQRCode && (
            <div className="flex gap-4">
              <Button color="secondary" onClick={() => setShowQRCode(true)}>
                Show QR
              </Button>
              {window.webln && (
                <Button
                  onClick={async () => {
                    try {
                      if (!window.webln) {
                        throw new Error("webln not found");
                      }
                      setPaying(true);
                      await window.webln.enable();
                      window.webln.sendPayment(paymentRequest);
                    } catch (error) {
                      setPaying(false);
                      alert((error as Error).message);
                    }
                  }}>
                  Pay Now
                </Button>
              )}
            </div>
          )}
          {showQRCode && (
            <>
              <div className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4" />
                <p className="text-xs">Waiting for payment</p>
              </div>
              <p className="text-sm">Click or scan the invoice below to pay</p>
              <Link
                href={`lightning:${paymentRequest}`}
                className="inline-flex items-center justify-center rounded-2xl border border-transparent bg-white p-2 font-medium text-black shadow-sm hover:brightness-95 focus:outline-none focus:ring-offset-2">
                <QRCode size={192} value={paymentRequest} />
              </Link>

              <Button
                size="sm"
                color="secondary"
                onClick={() => copyToClipboard(paymentRequest)}
                className="rounded-md text-subtle"
                StartIcon={isCopied ? "clipboard-check" : "clipboard"}>
                Copy Invoice
              </Button>
              <Link target="_blank" href="https://getalby.com" className="link mt-4 text-sm underline">
                Don&apos;t have a lightning wallet?
              </Link>
            </>
          )}
        </>
      )}
      <Link target="_blank" href="https://getalby.com">
        <div className="mt-4 flex items-center text-sm">
          Powered by&nbsp;
          <img title="Alby" src="/app-store/alby/logo.svg" alt="Alby" className="h-8 dark:hidden" />
          <img
            title="Alby"
            src="/app-store/alby/logo-dark.svg"
            alt="Alby"
            className="hidden h-8 dark:block"
          />
        </div>
      </Link>
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
              user: props.booking.user ? { ...props.booking.user, email: null } : { email: null, name: null },
              responses: undefined,
              attendees: undefined,
              location: props.booking.location ?? null,
              description: props.booking.description ?? null,
            },
            forwardParamsSuccessRedirect: props.eventType.forwardParamsSuccessRedirect ?? null,
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
    props.eventType.successRedirectUrl,
    props.eventType.forwardParamsSuccessRedirect,
    searchParams,
    t,
    utils.viewer.bookings,
  ]);

  return null;
}
