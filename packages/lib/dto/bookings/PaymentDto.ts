/**
 * Payment DTOs - Data Transfer Objects for payment data
 */

import type { PaymentOption } from "@calcom/prisma/enums";
import type { JsonValue } from "@calcom/types/JsonObject";

/**
 * Payment information
 */
export interface PaymentDto {
  id: number;
  uid: string;
  appId: string | null;
  bookingId: number;
  amount: number;
  fee: number;
  currency: string;
  success: boolean;
  refunded: boolean;
  data: JsonValue;
  externalId: string;
  paymentOption: PaymentOption | null;
}
