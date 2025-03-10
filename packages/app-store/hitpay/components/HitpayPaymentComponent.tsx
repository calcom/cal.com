import { useRouter } from "next/navigation";
import qs from "qs";
import { useEffect, useRef } from "react";
import { z } from "zod";

import { useHitPayDropIn } from "./HitPayDropIn";

const PaymentHitpayDataSchema = z.object({
  id: z.string(),
  url: z.string(),
  defaultLink: z.string(),
  eventTypeSlug: z.string(),
  bookingUid: z.string(),
  email: z.string(),
  bookingUserName: z.string(),
});

interface IPaymentComponentProps {
  payment: {
    data: unknown;
  };
}

export const HitpayPaymentComponent = (props: IPaymentComponentProps) => {
  const { isInitialized, init } = useHitPayDropIn();
  const isSucceeded = useRef<boolean>(false);
  const router = useRouter();
  const { payment } = props;
  const { data } = payment;
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  const parsedData = PaymentHitpayDataSchema.safeParse(data);

  useEffect(() => {
    if (parsedData.success) {
      if (window.self !== window.top && window.top) {
        if (!isInitialized) {
          const subUrl = parsedData.data.url.substring("https://securecheckout.".length);
          const arr = subUrl.split("/");
          const domain = arr[0];

          init(
            parsedData.data.defaultLink || "",
            {
              domain,
            },
            {
              paymentRequest: parsedData.data.id,
            },
            {
              onClose: onClose,
              onSuccess: onSuccess,
              onError: onError,
            }
          );
        }
      } else {
        router.replace(parsedData.data.url);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSuccess = () => {
    isSucceeded.current = true;
  };

  const onClose = () => {
    if (isSucceeded.current) {
      if (parsedData.success) {
        const queryParams = {
          "flag.coep": false,
          isSuccessBookingPage: true,
          email: parsedData.data.email,
          eventTypeSlug: parsedData.data.eventTypeSlug,
        };

        const query = qs.stringify(queryParams);
        const url = `/booking/${parsedData.data.bookingUid}?${query}`;
        router.replace(url);
      }
    }
  };

  const onError = (error: unknown) => {
    if (parsedData.success) {
      const url = `/${parsedData.data.bookingUserName}/${parsedData.data.eventTypeSlug}`;
      router.replace(url);
    }
  };

  if (!parsedData.success || !parsedData.data?.url) {
    return wrongUrl;
  }

  return <div />;
};
