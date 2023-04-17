import Link from "next/link";

import type { IMercadoPagoPaymentComponentProps } from "@calcom/app-store/mercado_pago/types";
import { IS_PRODUCTION } from "@calcom/lib/constants";

export const MercadoPagoPaymentComponent = (props: IMercadoPagoPaymentComponentProps) => {
  const { payment, eventType, user, location, bookingId, bookingUid } = props;
  const paymentInitLink = IS_PRODUCTION ? payment.data.init_point : payment.data.sandbox_init_point;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      MercadoPago
      <Link href={paymentInitLink}>Pay</Link>
    </div>
  );
};
