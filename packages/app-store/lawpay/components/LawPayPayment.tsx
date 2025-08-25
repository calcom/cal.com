import Link from "next/link";
import z from "zod";

interface ILawPayPaymentComponentProps {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
}

// Create zod schema for data
const PaymentLawPayDataSchema = z.object({
  payment_url: z.string().optional(),
  checkout_url: z.string().optional(),
  id: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
});

export const LawPayPaymentComponent = (props: ILawPayPaymentComponentProps) => {
  const { payment } = props;
  const { data } = payment;
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  const parsedData = PaymentLawPayDataSchema.safeParse(data);
  if (!parsedData.success) {
    return wrongUrl;
  }

  const paymentUrl = parsedData.data.payment_url || parsedData.data.checkout_url;
  if (!paymentUrl) {
    return wrongUrl;
  }

  return (
    <div className="mt-4 flex h-full w-full flex-col items-center justify-center">
      <Link
        href={paymentUrl}
        className="inline-flex items-center justify-center rounded-2xl border border-transparent bg-[#003d82] px-12 py-3 text-base font-medium text-white shadow-sm hover:bg-[#002a5a] focus:outline-none focus:ring-2 focus:ring-[#003d82] focus:ring-offset-2">
        <span className="flex items-center">
          <svg
            className="mr-2 h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Pay Securely with LawPay
        </span>
      </Link>
      <p className="mt-2 text-center text-xs text-gray-500">Trusted by 50,000+ legal professionals</p>
    </div>
  );
};
