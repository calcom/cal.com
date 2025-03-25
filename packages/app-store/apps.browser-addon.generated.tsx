import { EventTypeAppCardInterface as AlbyAddon } from "./alby/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as Basecamp3Addon } from "./basecamp3/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as ClosecomAddon } from "./closecom/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as FathomAddon } from "./fathom/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as Ga4Addon } from "./ga4/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as GiphyAddon } from "./giphy/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as GtmAddon } from "./gtm/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as HitpayAddon } from "./hitpay/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as HubspotAddon } from "./hubspot/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as InsightsAddon } from "./insihts/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as MatomoAddon } from "./matomo/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as MetapixelAddon } from "./metapixel/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as MockPaymentAppAddon } from "./mock-payment-app/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as PaypalAddon } from "./paypal/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as PipedriveCrmAddon } from "./pipedrive-crm/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as PlausibleAddon } from "./plausible/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as PosthogAddon } from "./posthog/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as QrCodeAddon } from "./qr_code/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as SalesforceAddon } from "./salesforce/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as StripePaymentAddon } from "./stripepayment/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as TwiplaAddon } from "./twipla/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as UmamiAddon } from "./umami/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as ZohoBiginAddon } from "./zoho-bigin/components/EventTypeAppCardInterface";
import { EventTypeAppCardInterface as ZohoCrmAddon } from "./zohocrm/components/EventTypeAppCardInterface";

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
  "booking-pages-tag": dynamic(
    () => import("./templates/booking-pages-tag/components/EventTypeAppCardInterface")
  ),
  "event-type-app-card": dynamic(
    () => import("./templates/event-type-app-card/components/EventTypeAppCardInterface")
  ),
};
