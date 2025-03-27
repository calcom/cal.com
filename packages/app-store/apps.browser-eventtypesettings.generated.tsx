import { default as AlbySettings } from "./alby/components/EventTypeAppSettingsInterface";
import { default as Basecamp3Settings } from "./basecamp3/components/EventTypeAppSettingsInterface";
import { default as FathomSettings } from "./fathom/components/EventTypeAppSettingsInterface";
import { default as Ga4Settings } from "./ga4/components/EventTypeAppSettingsInterface";
import { default as GiphySettings } from "./giphy/components/EventTypeAppSettingsInterface";
import { default as GtmSettings } from "./gtm/components/EventTypeAppSettingsInterface";
import { default as HitpaySettings } from "./hitpay/components/EventTypeAppSettingsInterface";
import { default as MetapixelSettings } from "./metapixel/components/EventTypeAppSettingsInterface";
import { default as PaypalSettings } from "./paypal/components/EventTypeAppSettingsInterface";
import { default as PlausibleSettings } from "./plausible/components/EventTypeAppSettingsInterface";
import { default as QrCodeSettings } from "./qr_code/components/EventTypeAppSettingsInterface";
import { default as StripepaymentSettings } from "./stripepayment/components/EventTypeAppSettingsInterface";

export const EventTypeSettingsMap = {
  alby: AlbySettings,
  basecamp3: Basecamp3Settings,
  fathom: FathomSettings,
  ga4: Ga4Settings,
  giphy: GiphySettings,
  gtm: GtmSettings,
  hitpay: HitpaySettings,
  metapixel: MetapixelSettings,
  paypal: PaypalSettings,
  plausible: PlausibleSettings,
  qr_code: QrCodeSettings,
  stripepayment: StripepaymentSettings,
};
