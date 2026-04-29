"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { z } from "zod";

const WaylPaymentDataSchema = z.object({
  paymentUrl: z.string().url(),
});

interface IWaylPaymentComponentProps {
  payment: {
    data: unknown;
  };
}

export const WaylPaymentComponent = ({ payment }: IWaylPaymentComponentProps) => {
  const router = useRouter();
  const parsed = WaylPaymentDataSchema.safeParse(payment.data);

  useEffect(() => {
    if (parsed.success) {
      router.replace(parsed.data.paymentUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!parsed.success) {
    return <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>;
  }

  return <div />;
};
