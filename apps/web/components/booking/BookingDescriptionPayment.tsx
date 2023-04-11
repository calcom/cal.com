import type { TFunction } from "next-i18next";

import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { FiCreditCard } from "@calcom/ui/components/icon";

const BookingDescriptionPayment = (props: {
  eventType: Parameters<typeof getPaymentAppData>[0];
  t: TFunction;
}) => {
  const paymentAppData = getPaymentAppData(props.eventType);
  if (!paymentAppData || paymentAppData.price <= 0) return null;

  const params = {
    amount: paymentAppData.price / 100.0,
    formatParams: { amount: { currency: paymentAppData.currency } },
  };

  return (
    <p className="text-bookinglight -ml-2 px-2 text-sm ">
      <FiCreditCard className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
      {paymentAppData.paymentOption === "HOLD" ? (
        <>{props.t("no_show_fee_amount", params)}</>
      ) : (
        <>
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: paymentAppData.currency,
          }).format(paymentAppData.price / 100)}
        </>
      )}
    </p>
  );
};

export default BookingDescriptionPayment;
