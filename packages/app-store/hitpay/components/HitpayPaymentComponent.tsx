import { useEffect } from "react";
import { z } from "zod";

const PaymentHitpayDataSchema = z.object({
  url: z.string(),
});

interface IPaymentComponentProps {
  payment: {
    data: unknown;
  };
}

export const HitpayPaymentComponent = (props: IPaymentComponentProps) => {
  const { payment } = props;
  const { data } = payment;
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  const parsedData = PaymentHitpayDataSchema.safeParse(data);

  useEffect(() => {
    if (window) {
      if (parsedData.success) {
        if (window.self !== window.top && window.top) {
          window.top.open(parsedData.data.url, "_blank");
        } else {
          window.location.href = parsedData.data.url;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!parsedData.success || !parsedData.data?.url) {
    return wrongUrl;
  }

  return <div />;
};
