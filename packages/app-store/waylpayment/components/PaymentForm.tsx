/**
 * components/PaymentForm.tsx
 *
 * Shown to the customer after they complete the booking form and payment is required.
 * Unlike Stripe (which embeds a card form), Wayl uses a hosted payment page.
 * We read the payment URL from the Payment record and immediately redirect the customer.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface WaylPaymentData {
  paymentUrl: string;
  waylReferenceId: string;
}

interface Props {
  payment: {
    id: number;
    data: WaylPaymentData;
    amount: number;
    currency: string;
  };
}

export default function WaylPaymentForm({ payment }: Props) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const paymentUrl = payment.data?.paymentUrl;

  useEffect(() => {
    if (!paymentUrl) return;

    if (countdown === 0) {
      window.location.href = paymentUrl;
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, paymentUrl]);

  if (!paymentUrl) {
    return (
      <div className="text-center p-6">
        <p className="text-red-500 font-medium">
          Payment link could not be generated. Please contact the organizer.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6 text-center">
      <div className="rounded-full bg-blue-100 p-4">
        {/* Wayl logo placeholder — replace with actual SVG */}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="24" fill="#1a56db" />
          <text x="24" y="30" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">W</text>
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900">Complete your payment</h2>
        <p className="mt-1 text-gray-500">
          Amount:{" "}
          <span className="font-medium text-gray-700">
            {payment.amount.toLocaleString("ar-IQ")} IQD
          </span>
        </p>
      </div>

      <p className="text-sm text-gray-500">
        Redirecting to Wayl in <span className="font-semibold text-gray-700">{countdown}</span>s…
      </p>

      <a
        href={paymentUrl}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Pay now via Wayl
      </a>

      <p className="text-xs text-gray-400">
        You will be redirected to Wayl&apos;s secure payment page. Your booking will be confirmed
        automatically once payment is complete.
      </p>
    </div>
  );
}
