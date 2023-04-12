import { i18n } from "next-i18next";
import type { TFunction } from "next-i18next";

import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { CreditCard } from "@calcom/ui/components/icon";

const BookingDescriptionPayment = (props: {
  eventType: Parameters<typeof getPaymentAppData>[0];
  t: TFunction;
  i18n: typeof i18n;
}) => {
  const paymentAppData = getPaymentAppData(props.eventType);
  if (!paymentAppData || paymentAppData.price <= 0) return null;

  const params = {
    amount: paymentAppData.price / 100.0,
    formatParams: { amount: { currency: paymentAppData.currency } },
  };

  return (
    <p className="text-bookinglight -ml-2 px-2 text-sm ">
      <CreditCard className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
      {paymentAppData.paymentOption === "HOLD" ? (
        <>{props.t("no_show_fee_amount", params)}</>
      ) : (
        <>
          {/* If undefined this will default to the browser locale */}
          {new Intl.NumberFormat(i18n?.language, {
            style: "currency",
            currency: paymentAppData.currency,
          }).format(paymentAppData.price / 100)}
        </>
      )}
    </p>
  );
};

export default BookingDescriptionPayment;
