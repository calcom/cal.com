import { default as AlbyAddon } from "./alby/components/EventTypeAppCardInterface";
import { default as Basecamp3Addon } from "./basecamp3/components/EventTypeAppCardInterface";
import { default as ClosecomAddon } from "./closecom/components/EventTypeAppCardInterface";
import { default as FathomAddon } from "./fathom/components/EventTypeAppCardInterface";
import { default as Ga4Addon } from "./ga4/components/EventTypeAppCardInterface";
import { default as GiphyAddon } from "./giphy/components/EventTypeAppCardInterface";
import { default as GtmAddon } from "./gtm/components/EventTypeAppCardInterface";
import { default as HitpayAddon } from "./hitpay/components/EventTypeAppCardInterface";
import { default as HubspotAddon } from "./hubspot/components/EventTypeAppCardInterface";
import { default as InsightsAddon } from "./insihts/components/EventTypeAppCardInterface";
import { default as MatomoAddon } from "./matomo/components/EventTypeAppCardInterface";
import { default as MetapixelAddon } from "./metapixel/components/EventTypeAppCardInterface";
import { default as MockPaymentAppAddon } from "./mock-payment-app/components/EventTypeAppCardInterface";
import { default as PaypalAddon } from "./paypal/components/EventTypeAppCardInterface";
import { default as PipedriveCrmAddon } from "./pipedrive-crm/components/EventTypeAppCardInterface";
import { default as PlausibleAddon } from "./plausible/components/EventTypeAppCardInterface";
import { default as PosthogAddon } from "./posthog/components/EventTypeAppCardInterface";
import { default as QrCodeAddon } from "./qr_code/components/EventTypeAppCardInterface";
import { default as SalesforceAddon } from "./salesforce/components/EventTypeAppCardInterface";
import { default as StripePaymentAddon } from "./stripepayment/components/EventTypeAppCardInterface";
import { default as BookingPagesTag } from "./templates/booking-pages-tag/components/EventTypeAppCardInterface";
import { default as EventTypeAppCard } from "./templates/event-type-app-card/components/EventTypeAppCardInterface";
import { default as TwiplaAddon } from "./twipla/components/EventTypeAppCardInterface";
import { default as UmamiAddon } from "./umami/components/EventTypeAppCardInterface";
import { default as ZohoBiginAddon } from "./zoho-bigin/components/EventTypeAppCardInterface";
import { default as ZohoCrmAddon } from "./zohocrm/components/EventTypeAppCardInterface";

// Static imports for dynamic imports, except for the dynamic templates
export const EventTypeAddonMap = {
  alby: AlbyAddon,
  basecamp3: Basecamp3Addon,
  closecom: ClosecomAddon,
  fathom: FathomAddon,
  ga4: Ga4Addon,
  giphy: GiphyAddon,
  gtm: GtmAddon,
  hitpay: HitpayAddon,
  hubspot: HubspotAddon,
  insihts: InsightsAddon,
  matomo: MatomoAddon,
  metapixel: MetapixelAddon,
  "mock-payment-app": MockPaymentAppAddon,
  paypal: PaypalAddon,
  "pipedrive-crm": PipedriveCrmAddon,
  plausible: PlausibleAddon,
  posthog: PosthogAddon,
  qr_code: QrCodeAddon,
  salesforce: SalesforceAddon,
  stripepayment: StripePaymentAddon,
  twipla: TwiplaAddon,
  umami: UmamiAddon,
  "zoho-bigin": ZohoBiginAddon,
  zohocrm: ZohoCrmAddon,
  // Dynamic imports for the templates
  "booking-pages-tag": BookingPagesTag,
  "event-type-app-card": EventTypeAppCard,
};
