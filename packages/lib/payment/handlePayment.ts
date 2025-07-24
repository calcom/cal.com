import type { AppCategories, Prisma } from "@prisma/client";

import appStore from "@calcom/app-store";
import { convertToSmallestCurrencyUnit } from "@calcom/app-store/_utils/payments/currencyConversions";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { Fields } from "@calcom/features/bookings/lib/getBookingFields";
import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";
import type { CompleteEventType } from "@calcom/prisma/zod";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

const isPaymentApp = (x: unknown): x is PaymentApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "PaymentService" in x.lib;

const isKeyOf = <T extends object>(obj: T, key: unknown): key is keyof T =>
  typeof key === "string" && key in obj;

const handlePayment = async ({
  evt,
  selectedEventType,
  paymentAppCredentials,
  booking,
  bookerName,
  bookerEmail,
  bookerPhoneNumber,
  isDryRun = false,
  bookingFields,
  locale = "en",
}: {
  evt: CalendarEvent;
  selectedEventType: Pick<CompleteEventType, "metadata" | "title">;
  paymentAppCredentials: {
    key: Prisma.JsonValue;
    appId: EventTypeAppsList;
    app: {
      dirName: string;
      categories: AppCategories[];
    } | null;
  };
  booking: {
    user: { email: string | null; name: string | null; timeZone: string; username: string | null } | null;
    id: number;
    userId: number | null;
    startTime: { toISOString: () => string };
    uid: string;
  };
  bookerName: string;
  bookerEmail: string;
  bookerPhoneNumber?: string | null;
  isDryRun?: boolean;
  bookingFields?: Fields;
  locale?: string;
}) => {
  if (isDryRun) return null;
  const key = paymentAppCredentials?.app?.dirName;
  if (!isKeyOf(appStore, key)) {
    console.warn(`key: ${key} is not a valid key in appStore`);
    return null;
  }
  const paymentApp = await appStore[key]?.();
  if (!isPaymentApp(paymentApp)) {
    console.warn(`payment App service of type ${paymentApp} is not implemented`);
    return null;
  }
  const PaymentService = paymentApp.lib.PaymentService;
  const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;

  const apps = eventTypeAppMetadataOptionalSchema.parse(selectedEventType?.metadata?.apps);
  const paymentOption = apps?.[paymentAppCredentials.appId].paymentOption || "ON_BOOKING";
  const paymentCurrency = apps?.[paymentAppCredentials.appId].currency;

  let totalAmount = apps?.[paymentAppCredentials.appId].price || 0;

  if ((bookingFields || [])?.length > 0) {
    let addonsPrice = 0;

    // Process each booking field
    (bookingFields || []).forEach((field) => {
      // Skip fields that don't support pricing
      if (
        !fieldTypesConfigMap[field.type]?.supportsPricing &&
        !fieldTypesConfigMap[field.type]?.optionsSupportPricing
      ) {
        return;
      }

      // Type assertion for price-related fields
      const typedInput = field as { price?: number; options?: { value: string; price?: number }[] };
      const response = evt.responses?.[field.name];

      // Skip if no response for this field
      if (!response) return;

      switch (field.type) {
        case "number":
          // Multiply the numeric value by the field's price
          const parsedValue = Number((response.value ?? "").toString().trim());
          const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0;
          addonsPrice += safeValue * (typedInput.price || 0);
          break;

        case "boolean":
          // Add price if boolean field is true
          if (response.value) {
            addonsPrice += typedInput.price || 0;
          }
          break;

        case "select":
        case "radio":
          // For select and radio, find the selected option and add its price
          const selectedValue = response.value;
          let selectedOption;

          if (field.type === "radio") {
            // For radio, the value coming is the label itself (formatted with price)
            selectedOption = typedInput.options?.find((opt) => {
              const formattedValue = `${opt.value} (${Intl.NumberFormat(locale, {
                style: "currency",
                currency: paymentCurrency,
              }).format(opt.price || 0)})`;
              return formattedValue === selectedValue;
            });
          } else {
            // For select, match by direct value
            selectedOption = typedInput.options?.find((opt) => opt.value === selectedValue);
          }

          addonsPrice += selectedOption?.price || 0;
          break;

        case "checkbox":
        case "multiselect":
          // For checkbox and multiselect, add prices of all selected options
          const responseValue = response.value;
          const selectedValues = Array.isArray(responseValue)
            ? responseValue
            : responseValue
            ? [responseValue]
            : [];

          selectedValues.forEach((value) => {
            const option = typedInput.options?.find((opt) => opt.value === value);
            addonsPrice += option?.price || 0;
          });
          break;
      }
    });

    totalAmount += convertToSmallestCurrencyUnit(addonsPrice, paymentCurrency);
  }

  const paymentPriceAndCurrency = {
    amount: totalAmount,
    currency: paymentCurrency,
  };

  let paymentData;
  if (paymentOption === "HOLD") {
    paymentData = await paymentInstance.collectCard(
      paymentPriceAndCurrency,
      booking.id,
      paymentOption,
      bookerEmail,
      bookerPhoneNumber
    );
  } else {
    paymentData = await paymentInstance.create(
      paymentPriceAndCurrency,
      booking.id,
      booking.userId,
      booking.user?.username ?? null,
      bookerName,
      paymentOption,
      bookerEmail,
      bookerPhoneNumber,
      selectedEventType.title,
      evt.title
    );
  }

  if (!paymentData) {
    console.error("Payment data is null");
    throw new Error("Payment data is null");
  }
  try {
    await paymentInstance.afterPayment(evt, booking, paymentData, selectedEventType?.metadata);
  } catch (e) {
    console.error(e);
  }
  return paymentData;
};

export { handlePayment };
