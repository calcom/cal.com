import type { IMercadoPagoPaymentComponentProps } from "mercado_pago/lib/interfaces";
import Link from "next/link";

import { IS_PRODUCTION } from "@calcom/lib/constants";

export const MercadoPagoPaymentComponent = (props: IMercadoPagoPaymentComponentProps) => {
  const { payment, eventType, user, location, bookingId, bookingUid } = props;
  const paymentInitLink = IS_PRODUCTION ? payment.data.init_point : payment.data.sandbox_init_point;
  console.log({ paymentInitLink });
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Link
        href={paymentInitLink}
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-base font-medium text-black shadow-sm
        hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:ring-offset-2">
        <img src="/api/app-store/mercado_pago/icon.png" alt="Mercado Pago" className="mr-2 w-20" />
        <span>Pagar con Mercado Pago</span>
      </Link>
    </div>
  );
};
