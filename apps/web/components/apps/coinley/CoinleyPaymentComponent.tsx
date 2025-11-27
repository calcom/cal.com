"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import z from "zod";

import { useBookingSuccessRedirect } from "@calcom/features/bookings/lib/bookingSuccessRedirect";
import type { PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui/components/toast";


interface ICoinleyPaymentComponentProps {
  payment: {
    data: unknown;
  };
  paymentPageProps: PaymentPageProps;
}

// Create zod schema for Coinley payment data
const PaymentCoinleyDataSchema = z.object({
  success: z.boolean(),
  requestId: z.string(),
  amount: z.number(),
  payment: z.object({
    id: z.string(),
    amount: z.number(),
    totalAmount: z.number(),
    currency: z.string(),
    network: z.string(),
    status: z.enum(["pending", "confirmed", "failed"]),
    expiresAt: z.string(),
    paymentMethod: z.string(),
    contractAddress: z.string().optional(),
    merchantWallet: z.string().optional(),
    coinleyWallet: z.string().optional(),
    merchantPercentage: z.number().optional(),
    coinleyPercentage: z.number().optional(),
    chainId: z.number().optional(),
    tokenAddress: z.string().optional(),
    tokenDecimals: z.number().optional(),
  }),
  credentials: z.object({
    public_key: z.string(),
  }).optional(),
});

export const CoinleyPaymentComponent = (props: ICoinleyPaymentComponentProps) => {
  const { payment, paymentPageProps } = props;
  const { data } = payment;
  const bookingSuccessRedirect = useBookingSuccessRedirect();
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const coinleyInstanceRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRetryingRef = useRef(false); // Track if we're in retry mode to prevent cleanup closing modal
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasOpened, setHasOpened] = useState(false); // Prevent reopening
  const [isProcessing, setIsProcessing] = useState(false); // Track payment processing
  const [isCancelled, setIsCancelled] = useState(false); // Track if user cancelled payment

  // Parse data early so we can use it in hooks
  const parsedData = PaymentCoinleyDataSchema.safeParse(data);
  const paymentData = parsedData.success ? parsedData.data : null;
  const paymentInfo = paymentData?.payment;

  // Get credentials from payment data (stored when payment was created)
  const credentials = paymentData?.credentials || null;

  // API URL is hardcoded - users don't provide it
  const apiUrl = process.env.NEXT_PUBLIC_COINLEY_API_URL || "https://talented-mercy-production.up.railway.app";

  // Payment configuration for SDK (memoized to prevent re-renders)
  const paymentConfig = useMemo(() => {
    if (!paymentInfo) return null;

    console.log("[Coinley] Payment configuration:", {
      amount: paymentInfo.amount,
      network: paymentInfo.network,
      currency: paymentInfo.currency,
      merchantWallet: paymentInfo.merchantWallet,
      bookingId: paymentPageProps.booking.id,
      bookingUid: paymentPageProps.booking.uid,
      paymentDbId: paymentInfo.id,
    });

    return {
      amount: paymentInfo.amount,
      customerEmail: paymentPageProps.booking.attendees?.[0]?.email || "guest@calcom.com",
      merchantName: paymentPageProps.profile.name || "Cal.com Event",
      preferredNetwork: paymentInfo.network.toLowerCase(),
      preferredCurrency: paymentInfo.currency.toUpperCase(),
      callbackUrl: "https://google.com", // Not used - frontend handles confirmation
      metadata: {
        bookingId: paymentPageProps.booking.id,
        bookingUid: paymentPageProps.booking.uid,
        eventTypeId: paymentPageProps.eventType.id,
        paymentId: paymentInfo.id,
        source: "calcom",
        // Merchant wallet is determined by backend based on API key/secret
        merchantWallet: paymentInfo.merchantWallet,
      },
    };
  }, [paymentInfo, paymentPageProps]);

  // Handle successful payment - update booking directly like WooCommerce does
  const handlePaymentSuccess = useCallback(async (
    paymentId: unknown,
    transactionHash?: unknown,
    paymentDetails?: unknown
  ) => {
    console.log("[Coinley] ✅ Payment successful - Raw callback data:", {
      paymentId,
      paymentIdType: typeof paymentId,
      transactionHash,
      paymentDetails
    });

    // Prevent multiple processing
    if (isProcessing) {
      console.log("[Coinley] ⚠️ Already processing payment, skipping duplicate call");
      return;
    }
    setIsProcessing(true);

    // Close the modal immediately
    const instance = coinleyInstanceRef.current as { close?: () => void } | null;
    if (instance && instance.close) {
      console.log("[Coinley] Closing modal...");
      instance.close();
    }

    showToast("Payment successful! Confirming your booking...", "success");

    try {
      // Extract paymentId from object if needed
      let actualPaymentId: string;
      if (typeof paymentId === 'object' && paymentId !== null) {
        // Try common property names
        if ('id' in paymentId) {
          actualPaymentId = (paymentId as { id: string }).id;
        } else if ('paymentId' in paymentId) {
          actualPaymentId = (paymentId as { paymentId: string }).paymentId;
        } else {
          // Fallback: stringify the object
          actualPaymentId = JSON.stringify(paymentId);
          console.warn("[Coinley] paymentId is an object without 'id' property:", paymentId);
        }
      } else {
        actualPaymentId = String(paymentId);
      }

      console.log("[Coinley] Updating booking directly with payment info:", {
        bookingId: paymentPageProps.booking.id,
        paymentId: actualPaymentId,
        transactionHash,
      });

      // Update booking directly via API (like WooCommerce does with AJAX)
      const response = await fetch(`/api/integrations/coinley/confirm-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: paymentPageProps.booking.id,
          bookingUid: paymentPageProps.booking.uid,
          paymentId: actualPaymentId,
          transactionHash: transactionHash || "manual_confirmation",
          paymentDetails,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to confirm payment: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("[Coinley] ✅ Booking updated successfully:", result);

      showToast("Booking confirmed! Redirecting...", "success");

      const params: {
        uid: string;
        email: string | null;
        location: string;
      } = {
        uid: paymentPageProps.booking.uid,
        email: searchParams?.get("email") || null,
        location: t("web_conferencing_details_to_follow"),
      };

      // Redirect to success page
      setTimeout(() => {
        bookingSuccessRedirect({
          successRedirectUrl: paymentPageProps.eventType.successRedirectUrl,
          query: params,
          booking: paymentPageProps.booking,
          forwardParamsSuccessRedirect: paymentPageProps.eventType.forwardParamsSuccessRedirect,
        });
      }, 1000);

    } catch (error) {
      console.error("[Coinley] ❌ Error confirming payment:", error);
      showToast("Payment successful but confirmation failed. Please contact support with your transaction details.", "error");
      setIsProcessing(false);
    }
  }, [paymentPageProps, searchParams, t, bookingSuccessRedirect, isProcessing]);

  // Handle payment errors
  const handlePaymentError = useCallback((error: string) => {
    console.error("[Coinley] ❌ Payment error:", error);
    showToast(error || "Payment failed", "error");
  }, []);

  // Handle payment modal close
  const handlePaymentClose = useCallback(() => {
    console.log("[Coinley] ℹ️ Payment modal closed");
    // Only set cancelled if not processing (user manually closed)
    if (!isProcessing) {
      setIsCancelled(true);
    }
  }, [isProcessing]);

  // Handle retry payment
  const handleRetryPayment = useCallback(() => {
    console.log("[Coinley] 🔄 Retrying payment...");

    // Set retry flag BEFORE any state changes to prevent cleanup from closing modal
    isRetryingRef.current = true;

    // Close old modal if exists (but don't destroy - SDK might not support it)
    const oldInstance = coinleyInstanceRef.current as { close?: () => void } | null;
    if (oldInstance && typeof oldInstance.close === 'function') {
      try {
        oldInstance.close();
      } catch (e) {
        console.log("[Coinley] Error closing old modal:", e);
      }
    }

    // Clear instance ref so useEffect creates a new one
    coinleyInstanceRef.current = null;

    // Reset states - this will trigger the useEffect to reinitialize
    // Since CoinleyVanilla persists on window, it will be reused without reloading script
    setIsCancelled(false);
    setHasOpened(false);
    setIsInitialized(false);
  }, []);

  // Helper function to initialize SDK and open modal
  const initializeAndOpen = useCallback(() => {
    if (typeof window === "undefined" || !("CoinleyVanilla" in window) || !credentials || !paymentConfig) {
      return false;
    }

    try {
      const CoinleyVanillaConstructor = (window as unknown as { CoinleyVanilla: new (...args: unknown[]) => unknown }).CoinleyVanilla;
      coinleyInstanceRef.current = new CoinleyVanillaConstructor({
        publicKey: credentials.public_key,
        apiUrl: apiUrl,
        theme: "light",
        debug: true,
      });

      console.log("[Coinley] SDK initialized, opening modal...");

      // Open payment modal
      const instance = coinleyInstanceRef.current as { open: (config: unknown, callbacks: unknown) => void };
      instance.open(paymentConfig, {
        onSuccess: handlePaymentSuccess,
        onError: handlePaymentError,
        onClose: handlePaymentClose,
      });
      setIsInitialized(true);
      setHasOpened(true);

      // Clear retry flag after successful initialization
      isRetryingRef.current = false;

      console.log("[Coinley] Modal opened successfully");
      return true;
    } catch (error) {
      console.error("[Coinley] Failed to initialize:", error);
      showToast("Failed to load payment gateway", "error");
      return false;
    }
  }, [credentials, apiUrl, paymentConfig, handlePaymentSuccess, handlePaymentError, handlePaymentClose]);

  // Load Coinley CDN script and initialize (moved to top level before conditional returns)
  useEffect(() => {
    // Only initialize if we have all required data and haven't already opened
    if (!credentials || !credentials.public_key || !paymentConfig || hasOpened || isProcessing) {
      return;
    }

    // Skip if we already have an active instance
    if (coinleyInstanceRef.current) {
      console.log("[Coinley] Already have active instance, skipping");
      return;
    }

    // Check if CoinleyVanilla is already on window (from previous load or retry)
    if (typeof window !== "undefined" && "CoinleyVanilla" in window) {
      console.log("[Coinley] CoinleyVanilla already available, reusing...");
      initializeAndOpen();
      return;
    }

    // Check if script is already loading
    const existingScript = document.getElementById("coinley-sdk-script");
    if (existingScript) {
      console.log("[Coinley] Script already loading, waiting...");
      return;
    }

    console.log("[Coinley] Loading SDK from CDN...");

    // Load CSS first if not already present
    const existingLink = document.getElementById("coinley-sdk-styles");
    if (!existingLink) {
      const link = document.createElement("link");
      link.id = "coinley-sdk-styles";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/coinley-test@latest/dist/vanilla/style.css";
      document.head.appendChild(link);
    }

    // Load the Coinley CDN script
    const script = document.createElement("script");
    script.id = "coinley-sdk-script";
    script.src = "https://cdn.jsdelivr.net/npm/coinley-test@latest/dist/coinley-vanilla.min.js";
    script.async = true;
    script.onload = () => {
      console.log("[Coinley] SDK loaded successfully");
      initializeAndOpen();
    };
    script.onerror = () => {
      console.error("[Coinley] Failed to load CDN script");
      showToast("Failed to load payment gateway", "error");
    };

    document.head.appendChild(script);

    // Cleanup - but don't remove global script/styles, just close modal
    return () => {
      console.log("[Coinley] Cleanup effect triggered, isRetrying:", isRetryingRef.current);

      // Skip cleanup if we're retrying - the modal should stay open
      if (isRetryingRef.current) {
        console.log("[Coinley] Skipping cleanup - retry in progress");
        return;
      }

      const instance = coinleyInstanceRef.current as { close?: () => void } | null;
      if (instance && instance.close) {
        instance.close();
      }
      // Don't remove script/styles as they might be needed for other instances
      // Only reset the instance ref
      coinleyInstanceRef.current = null;
    };
  }, [credentials, apiUrl, paymentConfig, handlePaymentSuccess, handlePaymentError, handlePaymentClose, hasOpened, isProcessing, initializeAndOpen]); // Dependencies properly listed

  // Handle data validation errors
  if (!parsedData.success || !parsedData.data?.payment?.id) {
    console.error(
      "[Coinley] Failed to parse payment data:",
      !parsedData.success ? parsedData.error : "Missing payment ID"
    );
    return (
      <>
        <p className="mt-3 text-center">Couldn&apos;t obtain payment data</p>
      </>
    );
  }

  if (!credentials || !credentials.public_key) {
    console.error("[Coinley] Missing public key");
    return (
      <>
        <p className="mt-3 text-center text-red-600">
          Payment gateway not configured. Please contact support.
        </p>
      </>
    );
  }

  return (
    <div className="mb-4 mt-8 flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <h3 className="text-lg font-semibold mb-2">Complete Your Payment</h3>
          <p className="text-sm text-gray-600">
            Pay {paymentInfo?.amount} {paymentInfo?.currency}
          </p>
        </div>

        {/* Container for Coinley payment UI */}
        <div ref={containerRef} id="coinley-payment-container">
          {!isInitialized && !isProcessing && !isCancelled && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="ml-3 text-sm text-gray-600">Loading payment gateway...</p>
            </div>
          )}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
              <p className="mt-3 text-sm text-green-600">Processing payment...</p>
            </div>
          )}
          {isCancelled && (
            <div className="flex flex-col items-center justify-center p-8">
              <p className="text-sm text-gray-600 mb-4">Payment was cancelled. Click below to try again.</p>
              <button
                onClick={handleRetryPayment}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Supported: USDT, USDC • Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Celo, Base
        </p>

        <div className="text-xs text-gray-400">Powered by Coinley • Secured by Blockchain</div>
      </div>
    </div>
  );
};
