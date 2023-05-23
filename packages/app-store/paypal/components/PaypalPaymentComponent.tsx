import Link from "next/link";
import z from "zod";

import type { Payment } from "@calcom/prisma/client";

interface IPaypalPaymentComponentProps {
  payment: Payment;
}

// Create zod schema for data
const schema = z.object({
  id: z.string(),
  status: z.string(),
  links: z.array(
    z.object({
      href: z.string(),
      rel: z.string(),
      method: z.string(),
    })
  ),
});

export const PaypalPaymentComponent = (props: IPaypalPaymentComponentProps) => {
  const { payment } = props;
  const { data } = payment;
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  const parsedData = schema.safeParse(data);
  if (!parsedData.success || !parsedData.data.links) {
    return wrongUrl;
  }
  const paymentUrl = parsedData.data.links.find(
    (link) => link.rel === "approve" || link.rel === "payer-action"
  )?.href;
  if (!paymentUrl) {
    return wrongUrl;
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Link
        href={`${paymentUrl}`}
        className="inline-flex items-center justify-center rounded-md rounded-2xl border border-transparent bg-[#ffc439] px-12 py-2 text-base font-medium
        text-black shadow-sm hover:brightness-95 focus:outline-none focus:ring-offset-2">
        Pay with
        <img src="/api/app-store/paypal/paypal-logo.svg" alt="Paypal" className="mx-2 w-14" />
        <span />
      </Link>
    </div>
  );
};
