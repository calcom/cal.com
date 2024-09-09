import type { z } from "zod";
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
export type EventTypeApps = NonNullable<NonNullable<z.infer<typeof EventTypeMetaDataSchema>>["apps"]>;
export type EventTypeAppsList = keyof EventTypeApps;
export declare const getEventTypeAppData: <T extends "dailyvideo" | "feishucalendar" | "giphy" | "googlecalendar" | "googlevideo" | "hubspot" | "jitsivideo" | "larkcalendar" | "office365calendar" | "stripe" | "tandemvideo" | "vital" | "zapier" | "zoomvideo" | "alby" | "event-type-app-card" | "basecamp3" | "campsite" | "closecom" | "fathom" | "ga4" | "gtm" | "booking-pages-tag" | "intercom" | "jelly" | "make" | "matomo" | "metapixel" | "mock-payment-app" | "office365video" | "paypal" | "pipedrive-crm" | "plausible" | "posthog" | "qr_code" | "routing-forms" | "salesforce" | "shimmervideo" | "twipla" | "umami" | "webex" | "wordpress" | "zoho-bigin" | "zohocalendar" | "zohocrm">(eventType: Pick<BookerEvent, "price" | "currency" | "metadata">, appId: T, forcedGet?: boolean) => {
    alby?: {
        price: number;
        currency: string;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
    } | undefined;
    basecamp3?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    campsite?: {} | undefined;
    closecom?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    dailyvideo?: {} | undefined;
    fathom?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    } | undefined;
    feishucalendar?: {} | undefined;
    ga4?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    } | undefined;
    giphy?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        thankYouPage?: string | undefined;
    } | undefined;
    googlecalendar?: {} | undefined;
    googlevideo?: {} | undefined;
    gtm?: {
        trackingId: string;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    hubspot?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    intercom?: {} | undefined;
    jelly?: {} | undefined;
    jitsivideo?: {} | undefined;
    larkcalendar?: {} | undefined;
    make?: {} | undefined;
    matomo?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        MATOMO_URL?: string | undefined;
        SITE_ID?: string | undefined;
    } | undefined;
    metapixel?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    } | undefined;
    "mock-payment-app"?: {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
        enabled?: boolean | undefined;
    } | undefined;
    office365calendar?: {
        client_id: string;
        client_secret: string;
    } | undefined;
    office365video?: {
        client_id: string;
        client_secret: string;
    } | undefined;
    paypal?: {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
        enabled?: boolean | undefined;
    } | undefined;
    "pipedrive-crm"?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    plausible?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        PLAUSIBLE_URL?: string | undefined;
        trackingId?: string | undefined;
    } | undefined;
    posthog?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        TRACKING_ID?: string | undefined;
        API_HOST?: string | undefined;
    } | undefined;
    qr_code?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    "routing-forms"?: any;
    salesforce?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        roundRobinLeadSkip?: boolean | undefined;
        skipContactCreation?: boolean | undefined;
    } | undefined;
    shimmervideo?: {} | undefined;
    stripe?: {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
        enabled?: boolean | undefined;
    } | undefined;
    tandemvideo?: {} | undefined;
    "booking-pages-tag"?: {
        trackingId: string;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    "event-type-app-card"?: {
        isSunrise: boolean;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    twipla?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
    } | undefined;
    umami?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
        SCRIPT_URL?: string | undefined;
    } | undefined;
    vital?: {} | undefined;
    webex?: {} | undefined;
    wordpress?: {
        isSunrise: boolean;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    zapier?: {} | undefined;
    "zoho-bigin"?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    zohocalendar?: {} | undefined;
    zohocrm?: {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    } | undefined;
    zoomvideo?: {} | undefined;
}[T];
//# sourceMappingURL=getEventTypeAppData.d.ts.map