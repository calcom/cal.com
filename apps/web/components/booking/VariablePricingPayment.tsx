import { useMemo, useState } from "react";
import type { FormValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Spinner } from "@calcom/ui";

interface VariablePricingPaymentProps {
  eventTypeId: number;
  bookingForm: FormValues;
  onSuccess: (priceId: string, price: number, currency: string, metadata: Record<string, string>) => void;
  onError: (error: Error) => void;
}

export function VariablePricingPayment({
  eventTypeId,
  bookingForm,
  onSuccess,
  onError,
}: VariablePricingPaymentProps) {
  const { t } = useLocale();
  const [isCalculating, setIsCalculating] = useState(true);
  const [isCreatingPrice, setIsCreatingPrice] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState<{
    price: number;
    currency: string;
    breakdown: Array<{ description: string; amount: number; type: string }>;
  } | null>(null);

  const formValues = useFormContext<FormValues>()?.getValues() || {};

  // Get the stripeAccountId from the event type
  const { data: eventType } = trpc.viewer.eventTypes.get.useQuery({
    id: eventTypeId,
  });

  const stripeAppData = useMemo(() => {
    if (!eventType?.metadata?.apps?.stripe) return null;
    return eventType.metadata.apps.stripe;
  }, [eventType]);

  const stripeAccountId = stripeAppData?.stripe_user_id;

  // Calculate the price based on form values
  const { isLoading } = trpc.viewer.eventTypes.pricing.calculatePrice.useQuery(
    {
      eventTypeId,
      formValues,
    },
    {
      enabled: !!eventTypeId,
      onSuccess: (data) => {
        setCalculatedPrice({
          price: data.totalPrice,
          currency: data.currency,
          breakdown: data.breakdown,
        });
        setIsCalculating(false);
      },
      onError: (err) => {
        setIsCalculating(false);
        onError(new Error(err.message));
      },
    }
  );

  // Get or create a Stripe price ID for this booking
  const createPriceMutation = trpc.viewer.payments.stripe.calculateAndCreatePrice.useMutation({
    onSuccess: (data) => {
      setIsCreatingPrice(false);
      onSuccess(data.priceId, data.price, data.currency, data.metadata);
    },
    onError: (err) => {
      setIsCreatingPrice(false);
      onError(new Error(err.message));
    },
  });

  // Handle clicking the pay button
  const handlePayClick = () => {
    if (!calculatedPrice || !stripeAccountId) return;

    setIsCreatingPrice(true);

    // Create a Stripe price object for this booking
    createPriceMutation.mutate({
      eventTypeId,
      formValues,
      duration: bookingForm.duration || 30,
      startTime: bookingForm.startTime,
      endTime: bookingForm.endTime,
      stripeAccountId,
    });
  };

  // Format price for display
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  if (isCalculating || isLoading) {
    return (
      <div className="flex flex-col items-center py-8">
        <Spinner />
        <p className="mt-4 text-sm text-gray-500">{t("calculating_price")}</p>
      </div>
    );
  }

  if (!calculatedPrice) {
    return <div className="p-4 text-center text-red-500">{t("error_calculating_price")}</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-medium">{t("booking_summary")}</h3>

      <div className="rounded-md border p-4">
        <div className="divide-y">
          {calculatedPrice.breakdown.map((item, index) => (
            <div key={index} className="flex justify-between py-2">
              <span className="text-gray-700">
                {item.description || (item.type === "base" ? t("base_price") : t("adjustment"))}
              </span>
              <span className="font-medium">
                {item.type === "discount" ? "-" : ""}
                {formatPrice(item.amount, calculatedPrice.currency)}
              </span>
            </div>
          ))}

          <div className="flex justify-between py-2 font-bold">
            <span>{t("total")}</span>
            <span>{formatPrice(calculatedPrice.price, calculatedPrice.currency)}</span>
          </div>
        </div>
      </div>

      <Button color="primary" className="w-full" loading={isCreatingPrice} onClick={handlePayClick}>
        {t("continue_to_payment")}
      </Button>
    </div>
  );
}
