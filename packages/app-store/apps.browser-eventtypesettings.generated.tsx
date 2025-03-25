import { EventTypeAppSettingsInterface as AlbySettings } from "./alby/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as Basecamp3Settings } from "./basecamp3/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as FathomSettings } from "./fathom/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as Ga4Settings } from "./ga4/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as GiphySettings } from "./giphy/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as GtmSettings } from "./gtm/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as HitpaySettings } from "./hitpay/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as MetapixelSettings } from "./metapixel/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as PaypalSettings } from "./paypal/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as PlausibleSettings } from "./plausible/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as QrCodeSettings } from "./qr_code/components/EventTypeAppSettingsInterface";
import { EventTypeAppSettingsInterface as StripepaymentSettings } from "./stripepayment/components/EventTypeAppSettingsInterface";

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
