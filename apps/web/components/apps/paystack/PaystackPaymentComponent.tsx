"use client";

import dynamic from "next/dynamic";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";

const PaystackInlineComponent = dynamic(
  () => import("@calcom/app-store/paystack/components/PaystackPaymentComponent"),
  { ssr: false }
);

const PaystackPaymentDataSchema = z.object({
  access_code: z.string().min(1),
  authorization_url: z.string().url(),
  publicKey: z.string().min(1),
  reference: z.string().min(1),
});

type Props = {
  payment: { data: unknown };
  bookingUid: string;
  bookingTitle: string;
  amount: number;
  currency: string;
};

export const PaystackPaymentComponent = ({
  payment,
  bookingUid,
  bookingTitle,
  amount,
  currency,
}: Props) => {
  const { t } = useLocale();
  const parsed = PaystackPaymentDataSchema.safeParse(payment.data);

  if (!parsed.success) {
    return <p className="mt-3 text-center">{t("payment_failed_try_again")}</p>;
  }

  return (
    <PaystackInlineComponent
      payment={{ data: parsed.data }}
      bookingUid={bookingUid}
      bookingTitle={bookingTitle}
      amount={amount}
      currency={currency}
    />
  );
};
