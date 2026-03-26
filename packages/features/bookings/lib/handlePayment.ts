import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import type { Fields } from "@calcom/features/bookings/lib/getBookingFields";
import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";
import { convertToSmallestCurrencyUnit } from "@calcom/lib/currencyConversions";
import type { AppCategories, Prisma, EventType } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

const isPaymentService = (
  x: unknown
): x is { BuildPaymentService: (credentials: { key: unknown }) => unknown } =>
  !!x && typeof x === "object" && "BuildPaymentService" in x && typeof x.BuildPaymentService === "function";

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
  selectedEventType: Pick<EventType, "metadata" | "title">;
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

  const paymentAppImportFn = PaymentServiceMap[key as keyof typeof PaymentServiceMap];
  if (!paymentAppImportFn) {
    console.warn(`payment app not implemented for key: ${key}`);
    return null;
  }

  const paymentAppModule = await paymentAppImportFn;
  if (!isPaymentService(paymentAppModule)) {
    console.warn(`payment App service not found for key: ${key}`);
    return null;
  }
  const createPaymentService = paymentAppModule.BuildPaymentService;
  const paymentInstance = createPaymentService(paymentAppCredentials) as IAbstractPaymentService;

  const apps = eventTypeMetaDataSchemaWithTypedApps.parse(selectedEventType?.metadata)?.apps;

  const paymentOption = apps?.[paymentAppCredentials.appId].paymentOption || "ON_BOOKING";
  const paymentCurrency = apps?.[paymentAppCredentials.appId].currency;
  // Ensure we have a valid currency - fallback to USD if undefined
  const currency = paymentCurrency || "USD";

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
        case "number": {
          // Multiply the numeric value by the field's price
          const parsedValue = Number((response.value ?? "").toString().trim());
          const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0;
          addonsPrice += safeValue * (typedInput.price || 0);
          break;
        }

        case "boolean": {
          // Add price if boolean field is true
          if (response.value) {
            addonsPrice += typedInput.price || 0;
          }
          break;
        }

        case "select":
        case "radio": {
          // For select and radio, find the selected option and add its price
          const selectedValue = response.value;
          let selectedOption;

          if (field.type === "radio") {
            // For radio, the value coming is the label itself (formatted with price)
            selectedOption = typedInput.options?.find((opt) => {
              const formattedValue = `${opt.value} (${Intl.NumberFormat(locale, {
                style: "currency",
                currency: currency,
              }).format(opt.price || 0)})`;
              return formattedValue === selectedValue;
            });
          } else {
            // For select, match by direct value
            selectedOption = typedInput.options?.find((opt) => opt.value === selectedValue);
          }

          addonsPrice += selectedOption?.price || 0;
          break;
        }

        case "checkbox":
        case "multiselect": {
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
      }
    });

    totalAmount += convertToSmallestCurrencyUnit(addonsPrice, currency);
  }

  const paymentPriceAndCurrency = {
    amount: totalAmount,
    currency: currency,
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
