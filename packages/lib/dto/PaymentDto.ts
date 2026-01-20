/**
 * Payment DTOs - Data Transfer Objects for payment data
 */

import type { JsonValue } from "@calcom/types/JsonObject";

/**
 * Payment option values (ORM-agnostic string literal union)
 */
export type PaymentOptionDto = "ON_BOOKING" | "HOLD";

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
  paymentOption: PaymentOptionDto | null;
}
