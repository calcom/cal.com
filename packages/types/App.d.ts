import { Prisma } from "@prisma/client";

/**
 * This is the definition for an app store's app metadata.
 * This is used to display App info, categorize or hide certain apps in the app store.
 */
export interface App {
  /**
   * Wheter if the app is installed or not. Usually we check for api keys in env
   * variables to determine if this is true or not.
   * */
  installed: boolean;
  /** The app type */
  type: `${string}_calendar` | `${string}_payment` | `${string}_video` | `${string}_web3` | `${string}_other`;
  /** The display name for the app, TODO settle between this or name */
  title: string;
  /** The display name for the app */
  name: string;
  /** A brief description, usually found in the app's package.json */
  description: string;
  /** The icon to display in /apps/installed */
  imageSrc: string;
  /** TODO determine if we should use this instead of category */
  variant: "calendar" | "payment" | "conferencing";
  label: string;
  /** The slug for the app store public page inside `/apps/[slug] */
  slug: string;
  /** The category to which this app belongs, currently we have `calendar`, `payment` or `video`  */
  category: string;
  /** An abosolute url to the app logo */
  logo: string;
  /** Company or individual publishing this app */
  publisher: string;
  /** App's website */
  url: string;
  /** Optional documentation website URL */
  docsUrl?: string;
  /** Wether if the app is verified by Cal.com or not */
  verified: boolean;
  /** Wether the app should appear in the trending section of the app store */
  trending: boolean;
  /** Rating from 0 to 5, harcoded for now. Should be fetched later on. */
  rating: number;
  /** Number of reviews, harcoded for now. Should be fetched later on. */
  reviews: number;
  /**
   *  Wheter if the app is installed globally or needs user intervention.
   * Used to show Connect/Disconnect buttons in App Store
   * */
  isGlobal?: boolean;
  /** A contact email, mainly to ask for support */
  email: string;
  /** Add this value as a posible location option in event types */
  locationType?: string;
  /** Needed API Keys (usually for global apps) */
  key?: Prisma.JsonValue;
  /** Needed API Keys (usually for global apps) */
  key?: Prisma.JsonValue;
  /** If not free, what kind of fees does the app have */
  feeType?: "monthly" | "usage-based" | "one-time" | "free";
  /** 0 = free. if type="usage-based" it's the price per booking */
  price?: number;
  /** only required for "usage-based" billing. % of commission for paid bookings */
  commission?: number;
}
