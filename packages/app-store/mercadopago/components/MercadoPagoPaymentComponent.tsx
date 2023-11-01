import Link from "next/link";
import z from "zod";

type Props = {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
};

// Create zod schema for data
const PaymentMercadoPagoDataSchema = z.object({
  preference: z.object({
    id: z.string(),
    init_point: z.string().url(),
    sandbox_init_point: z.string().url(),
  }),
});

const wrongUrl = (
  <>
    <p className="mt-3 text-center">Couldn&apos;t obtain MercadoPago payment URL</p>
  </>
);

export function MercadoPagoPaymentComponent({ payment }: Props) {
  const parsedData = PaymentMercadoPagoDataSchema.safeParse(payment.data);
  if (!parsedData.success) {
    return wrongUrl;
  }
  return (
    <div className="mt-4 flex h-full w-full flex-col items-center justify-center">
      <Link
        href={`${parsedData.data.preference.init_point}`}
        className="inline-flex items-center justify-center rounded-2xl rounded-md border border-transparent bg-[#009ee3] px-6 py-2 text-base
        font-medium text-white shadow-sm hover:brightness-95 focus:outline-none focus:ring-offset-2">
        <img src="/api/app-store/mercadopago/icon.svg" alt="MercadoPago" className="mr-2 w-10" />
        Pay with MercadoPago
        <span />
      </Link>
    </div>
  );
}
