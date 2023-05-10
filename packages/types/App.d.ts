import type { Prisma } from "@prisma/client";

import type { Tag } from "@calcom/app-store/types";

type CommonProperties = {
  default?: false;
  type: string;
  label: string;
  messageForOrganizer?: string;
  iconUrl?: string;
  variable?: "locationLink";
  defaultValueVariable?: "link";
  attendeeInputType?: null;
  attendeeInputPlaceholder?: null;
};

type StaticLinkBasedEventLocation = {
  linkType: "static";
  urlRegExp: string;
  organizerInputPlaceholder?: string;
  organizerInputType?: "text" | "phone";
} & CommonProperties;

type DynamicLinkBasedEventLocation = {
  linkType: "dynamic";
  urlRegExp?: null;
  organizerInputType?: null;
  organizerInputPlaceholder?: null;
} & CommonProperties;

export type EventLocationTypeFromAppMeta = StaticLinkBasedEventLocation | DynamicLinkBasedEventLocation;

type AppData = {
  location?: EventLocationTypeFromAppMeta;
  tag?: Tag;
} | null;

/**
 * This is the definition for an app store's app metadata.
 * This is used to display App info, categorize or hide certain apps in the app store.
 */
export interface App {
  /**
   * @deprecated
   * Whether if the app is installed or not. Usually we check for api keys in env
   * variables to determine if this is true or not.
   * */
  installed?: boolean;
  /** The app type */
  type:
    | `${string}_calendar`
    | `${string}_messaging`
    | `${string}_payment`
    | `${string}_video`
    | `${string}_web3`
    | `${string}_other`
    | `${string}_automation`
    | `${string}_analytics`
    | `${string}_other_calendar`;

  /**
   * @deprecated
   *
   * Use name instead. Remove this property after ensuring name has the required value everywhere
   * */
  title?: string;
  /** The display name for the app */
  name: string;
  /** A brief description, usually found in the app's package.json */
  description: string;
  /** TODO determine if we should use this instead of category */
  variant:
    | "calendar"
    | "payment"
    | "conferencing"
    | "video"
    | "other"
    | "other_calendar"
    | "web3"
    | "automation";
  /** The slug for the app store public page inside `/apps/[slug] */
  slug: string;

  /** The category to which this app belongs, currently we have `calendar`, `payment` or `video`  */
  /*
   * @deprecated Use categories
   */
  category?: string;

  /** The category to which this app belongs, currently we have `calendar`, `payment` or `video`  */
  categories: string[];
  /**
   * `User` is the broadest category. `EventType` is when you want to add features to EventTypes.
   * See https://app.gitbook.com/o/6snd8PyPYMhg0wUw6CeQ/s/VXRprBTuMlihk37NQgUU/~/changes/6xkqZ4qvJ3Xh9k8UaWaZ/engineering/product-specs/app-store#user-apps for more details
   */
  extendsFeature?: "EventType" | "User";
  /** An absolute url to the app logo */
  logo: string;
  /** Company or individual publishing this app */
  publisher: string;
  /** App's website */
  url: string;
  /** Optional documentation website URL */
  docsUrl?: string;
  /** Wether if the app is verified by Cal.com or not */
  verified?: boolean;
  /** Wether the app should appear in the trending section of the app store */
  trending?: boolean;
  /** Rating from 0 to 5, harcoded for now. Should be fetched later on. */
  rating?: number;
  /** Number of reviews, harcoded for now. Should be fetched later on. */
  reviews?: number;
  /**
   *  Wheter if the app is installed globally or needs user intervention.
   * Used to show Connect/Disconnect buttons in App Store
   * */
  isGlobal?: boolean;
  /** A contact email, mainly to ask for support */
  email: string;
  /** Needed API Keys (usually for global apps) */
  key?: Prisma.JsonValue;
  /** If not free, what kind of fees does the app have */
  feeType?: "monthly" | "usage-based" | "one-time" | "free";
  /** 0 = free. if type="usage-based" it's the price per booking */
  price?: number;
  /** only required for "usage-based" billing. % of commission for paid bookings */
  commission?: number;
  licenseRequired?: boolean;
  isProOnly?: boolean;
  appData?: AppData;
  /**
   * @deprecated
   * Used only by legacy apps which had slug different from their directory name.
   */
  dirName?: string;
  isTemplate?: boolean;
  __template?: string;
  /** Slug of an app needed to be installed before the current app can be added */
  dependencies?: string[];
}

export type AppFrontendPayload = Omit<App, "key"> & {
  /** We should type error if keys are leaked to the frontend */
  isDefault?: boolean;
  key?: never;
  dependencyData?: {
    name?: string;
    installed?: boolean;
  }[];
};

export type AppMeta = App;
