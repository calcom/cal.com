import Link from "next/link";
import { useState } from "react";
import QRCode from "react-qr-code";
import z from "zod";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { Button } from "@calcom/ui";
import { ClipboardCheck, Clipboard } from "@calcom/ui/components/icon";
import { Spinner } from "@calcom/ui/components/icon/Spinner";

interface IAlbyPaymentComponentProps {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
}

// Create zod schema for data
const PaymentAlbyDataSchema = z.object({
  invoice: z
    .object({
      paymentRequest: z.string(),
    })
    .optional(),
  capture: z.object({}).optional(),
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
    <div className="mb-4 mt-8 flex h-full w-full flex-col items-center justify-center gap-4">
      {isPaying && <Spinner className="mt-12 h-8 w-8" />}
      {!isPaying && (
        <>
          {/* <p className="break-all">Payment {JSON.stringify(payment)}</p> */}
          {!showQRCode && (
            <div className="flex gap-4">
              <Button color="secondary" onClick={() => setShowQRCode(true)}>
                Show QR
              </Button>
              {window.webln && (
                <Button
                  onClick={async () => {
                    try {
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
              <p className="text-sm">Click or scan the invoice below to pay</p>
              <Link
                href={`lightning:${paymentRequest}`}
                className="inline-flex items-center justify-center rounded-2xl rounded-md border border-transparent p-2
            font-medium text-black shadow-sm hover:brightness-95 focus:outline-none focus:ring-offset-2">
                <QRCode size={128} value={paymentRequest} />
              </Link>

              <Button
                size="sm"
                color="secondary"
                onClick={() => copyToClipboard(paymentRequest)}
                className="text-subtle rounded-md"
                StartIcon={isCopied ? ClipboardCheck : Clipboard}>
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
          Powered by
          <img title="Alby" src="/app-store/alby/icon.svg" alt="Alby" className="h-8 w-8" />
        </div>
      </Link>
    </div>
  );
};
