import Link from "next/link";

import type { Payment } from "@calcom/prisma/client";

interface IPaypalPaymentComponentProps {
  payment: Payment;
}

export const PaypalPaymentComponent = (props: IPaypalPaymentComponentProps) => {
  const { payment } = props;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Link
        href=""
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-base font-medium text-black shadow-sm
        hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:ring-offset-2">
        Pay with
        <img src="/api/app-store/paypal/icon.png" alt="Paypal" className="mr-2 w-20" />
        <span />
      </Link>
    </div>
  );
};
