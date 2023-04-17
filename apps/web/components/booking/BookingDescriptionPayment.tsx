import type { TFunction } from "next-i18next";
import { FormattedNumber, IntlProvider } from "react-intl";

import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { CreditCard } from "@calcom/ui/components/icon";

const BookingDescriptionPayment = (props: {
  eventType: Parameters<typeof getPaymentAppData>[0];
  t: TFunction;
}) => {
  const paymentAppData = getPaymentAppData(props.eventType);
  if (!paymentAppData || paymentAppData.price <= 0) return null;

  return (
    <p className="text-bookinglight -ml-2 px-2 text-sm ">
      <CreditCard className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
      {paymentAppData.paymentOption === "HOLD" ? (
        <>
          {props.t("no_show_fee_amount", {
            amount: paymentAppData.price / 100.0,
            formatParams: { amount: { currency: paymentAppData.currency } },
          })}
        </>
      ) : (
        <IntlProvider locale="en">
          <FormattedNumber
            value={paymentAppData.price / 100.0}
            style="currency"
            currency={paymentAppData.currency?.toUpperCase()}
          />
        </IntlProvider>
      )}
    </p>
  );
};

export default BookingDescriptionPayment;
