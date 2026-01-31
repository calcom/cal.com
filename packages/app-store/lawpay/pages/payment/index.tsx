import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

export default function LawPayPaymentPage() {
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "cancelled">("loading");

  useEffect(() => {
    const handlePaymentStatus = () => {
      const paymentStatus = searchParams?.get("payment_status");
      const bookingUid = searchParams?.get("booking_uid");

      if (!paymentStatus || !bookingUid) {
        return;
      }

      switch (paymentStatus) {
        case "success":
          setStatus("success");
          // Redirect to booking confirmation page after a short delay
          setTimeout(() => {
            router.push(`/booking/${bookingUid}?paymentStatus=success`);
          }, 2000);
          break;
        case "cancelled":
          setStatus("cancelled");
          break;
        default:
          setStatus("error");
      }
    };

    if (searchParams) {
      handlePaymentStatus();
    }
  }, [searchParams, router]);

  const getStatusContent = () => {
    switch (status) {
      case "loading":
        return {
          icon: "loader" as const,
          title: "Processing Payment",
          message: "Please wait while we process your payment...",
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          animate: "animate-spin",
        };
      case "success":
        return {
          icon: "circle-check" as const,
          title: "Payment Successful",
          message: "Your payment has been processed successfully. You will be redirected shortly.",
          color: "text-green-600",
          bgColor: "bg-green-100",
          animate: "",
        };
      case "cancelled":
        return {
          icon: "circle-x" as const,
          title: "Payment Cancelled",
          message: "Your payment was cancelled. You can try again or contact support if needed.",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          animate: "",
        };
      case "error":
        return {
          icon: "circle-alert" as const,
          title: "Payment Error",
          message: "There was an error processing your payment. Please try again or contact support.",
          color: "text-red-600",
          bgColor: "bg-red-100",
          animate: "",
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${statusContent.bgColor}`}>
            <Icon
              name={statusContent.icon}
              className={`h-8 w-8 ${statusContent.color} ${statusContent.animate}`}
            />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{statusContent.title}</h2>
          <p className="mt-2 text-sm text-gray-600">{statusContent.message}</p>
        </div>

        {status === "cancelled" || status === "error" ? (
          <div className="mt-8 space-y-4">
            <Button
              onClick={() => router.back()}
              className="flex w-full justify-center px-4 py-2"
              color="primary">
              {status === "cancelled" ? "Go Back" : "Try Again"}
            </Button>
            <Button
              onClick={() => router.push("/lawpay/support")}
              className="flex w-full justify-center px-4 py-2"
              color="secondary">
              Contact Support
            </Button>
          </div>
        ) : null}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by{" "}
            <a href="https://lawpay.com" target="_blank" rel="noopener noreferrer" className="font-medium">
              LawPay
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
