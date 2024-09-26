import { useEffect } from "react";
import z from "zod";

import type { PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";

interface IPaymentComponentProps {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
  paymentPageProps: PaymentPageProps;
}

// Create zod schema for data
const PaymentHitpayDataSchema = z.object({
  url: z.string().required(),
});

export const HitpayPaymentComponent = (props: IPaymentComponentProps) => {
  const { payment } = props;
  const { data } = payment;
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  useEffect(() => {
    if (window) {
      window.location.href = parsedData.data.url;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedData = PaymentHitpayDataSchema.safeParse(data);
  if (!parsedData.success || !parsedData.data?.url) {
    return wrongUrl;
  }

  return <div>Loading ...</div>;
};
