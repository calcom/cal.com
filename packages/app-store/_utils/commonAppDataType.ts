/**
 * Common shape for app metadata properties that may exist on any app.
 *
 * The generated appDataSchemas union includes {} (empty object) variants from apps
 * with no custom schema (e.g. dailyvideo). This means when iterating over parsed app
 * metadata, TypeScript cannot guarantee that common properties like `enabled`, `price`,
 * or `currency` exist on all variants of the union.
 *
 * Use this interface to safely narrow app metadata values before accessing these
 * common properties. Cast with `as CommonAppData` when you need to access shared
 * fields across different app types.
 */
export interface CommonAppData {
  enabled?: boolean;
  price?: number;
  currency?: string;
  credentialId?: number;
  appCategories?: string[];
  paymentOption?: string;
  TRACKING_ID?: string;
  trackingId?: string;
  trackingEvent?: string;
  autoChargeNoShowFeeIfCancelled?: boolean;
  autoChargeNoShowFeeTimeValue?: number;
  autoChargeNoShowFeeTimeUnit?: string;
}
