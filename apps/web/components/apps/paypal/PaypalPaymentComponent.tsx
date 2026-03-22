"use client";

import Link from "next/link";
import z from "zod";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["PaypalPaymentComponent"] });

interface IPaypalPaymentComponentProps {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
}

// Create zod schema for data
const PaymentPaypalDataSchema = z.object({
  order: z
    .object({
      id: z.string(),
      status: z.string(),
      links: z.array(
        z.object({
          href: z.string(),
          rel: z.string(),
          method: z.string(),
        })
      ),
    })
    .optional(),
  capture: z.object({}).optional(),
});

export const PaypalPaymentComponent = (props: IPaypalPaymentComponentProps) => {
  const { payment } = props;
  const { data } = payment;
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  const parsedData = PaymentPaypalDataSchema.safeParse(data);
  if (!parsedData.success) {
    log.error("Failed to parse PayPal payment data", {
      error: parsedData.error.format(),
      rawData: data,
    });
    return wrongUrl;
  }
  if (!parsedData.data?.order?.links) {
    log.error("PayPal payment data missing order links", {
      hasOrder: !!parsedData.data?.order,
      hasLinks: !!parsedData.data?.order?.links,
      rawData: data,
    });
    return wrongUrl;
  }
  const paymentUrl = parsedData.data.order.links.find(
    (link) => link.rel === "approve" || link.rel === "payer-action"
  )?.href;
  if (!paymentUrl) {
    return wrongUrl;
  }
  return (
    <div className="mt-4 flex h-full w-full flex-col items-center justify-center">
      <Link
        href={`${paymentUrl}`}
        className="inline-flex items-center justify-center rounded-2xl rounded-md border border-transparent bg-[#ffc439] px-12 py-2 text-base
        font-medium text-black shadow-sm hover:brightness-95 focus:outline-none focus:ring-offset-2">
        Pay with
        <img src="/app-store/paypal/paypal-logo.svg" alt="Paypal" className="mx-2 mb-1 mt-2 w-16" />
        <span />
      </Link>
    </div>
  );
};
