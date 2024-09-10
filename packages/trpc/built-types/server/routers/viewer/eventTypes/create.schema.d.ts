import type { z } from "zod";
export declare const ZCreateInputSchema: z.ZodEffects<z.ZodObject<{
    length: z.ZodNumber;
    title: z.ZodString;
    slug: z.ZodEffects<z.ZodString, string, string>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    locations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        address: z.ZodOptional<z.ZodString>;
        link: z.ZodOptional<z.ZodString>;
        displayLocationPublicly: z.ZodOptional<z.ZodBoolean>;
        hostPhoneNumber: z.ZodOptional<z.ZodString>;
        credentialId: z.ZodOptional<z.ZodNumber>;
        teamName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        address?: string | undefined;
        link?: string | undefined;
        displayLocationPublicly?: boolean | undefined;
        hostPhoneNumber?: string | undefined;
        credentialId?: number | undefined;
        teamName?: string | undefined;
    }, {
        type: string;
        address?: string | undefined;
        link?: string | undefined;
        displayLocationPublicly?: boolean | undefined;
        hostPhoneNumber?: string | undefined;
        credentialId?: number | undefined;
        teamName?: string | undefined;
    }>, "many">>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    teamId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    disableGuests: z.ZodOptional<z.ZodBoolean>;
    minimumBookingNotice: z.ZodOptional<z.ZodNumber>;
    beforeEventBuffer: z.ZodOptional<z.ZodNumber>;
    afterEventBuffer: z.ZodOptional<z.ZodNumber>;
    schedulingType: z.ZodOptional<z.ZodNullable<z.ZodNativeEnum<{
        readonly ROUND_ROBIN: "ROUND_ROBIN";
        readonly COLLECTIVE: "COLLECTIVE";
        readonly MANAGED: "MANAGED";
    }>>>;
    scheduleId: z.ZodOptional<z.ZodNumber>;
    slotInterval: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        smartContractAddress: z.ZodOptional<z.ZodString>;
        blockchainId: z.ZodOptional<z.ZodNumber>;
        multipleDuration: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        giphyThankYouPage: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodObject<{
            alby: z.ZodOptional<z.ZodObject<{
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                price: z.ZodNumber;
                currency: z.ZodString;
                paymentOption: z.ZodOptional<z.ZodString>;
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                price: number;
                currency: string;
                appCategories?: string[] | undefined;
                paymentOption?: string | undefined;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
            }, {
                price: number;
                currency: string;
                appCategories?: string[] | undefined;
                paymentOption?: string | undefined;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
            }>>;
            basecamp3: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            campsite: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            closecom: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            dailyvideo: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            fathom: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                trackingId: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                trackingId?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                trackingId?: string | undefined;
            }>>;
            feishucalendar: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            ga4: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                trackingId: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                trackingId?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                trackingId?: string | undefined;
            }>>;
            giphy: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                thankYouPage: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                thankYouPage?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                thankYouPage?: string | undefined;
            }>>;
            googlecalendar: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            googlevideo: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            gtm: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                trackingId: z.ZodEffects<z.ZodString, string, string>;
            }, "strip", z.ZodTypeAny, {
                trackingId: string;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                trackingId: string;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            hubspot: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            intercom: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            jelly: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            jitsivideo: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            larkcalendar: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            make: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            matomo: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                MATOMO_URL: z.ZodOptional<z.ZodString>;
                SITE_ID: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                MATOMO_URL?: string | undefined;
                SITE_ID?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                MATOMO_URL?: string | undefined;
                SITE_ID?: string | undefined;
            }>>;
            metapixel: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                trackingId: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                trackingId?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                trackingId?: string | undefined;
            }>>;
            "mock-payment-app": z.ZodOptional<z.ZodObject<{
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                price: z.ZodNumber;
                currency: z.ZodString;
                paymentOption: z.ZodOptional<z.ZodString>;
                enabled: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                price: number;
                currency: string;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                paymentOption?: string | undefined;
                enabled?: boolean | undefined;
            }, {
                price: number;
                currency: string;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                paymentOption?: string | undefined;
                enabled?: boolean | undefined;
            }>>;
            office365calendar: z.ZodOptional<z.ZodObject<{
                client_id: z.ZodString;
                client_secret: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                client_id: string;
                client_secret: string;
            }, {
                client_id: string;
                client_secret: string;
            }>>;
            office365video: z.ZodOptional<z.ZodObject<{
                client_id: z.ZodString;
                client_secret: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                client_id: string;
                client_secret: string;
            }, {
                client_id: string;
                client_secret: string;
            }>>;
            paypal: z.ZodOptional<z.ZodObject<{
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                price: z.ZodNumber;
                currency: z.ZodString;
                paymentOption: z.ZodOptional<z.ZodString>;
                enabled: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                price: number;
                currency: string;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                paymentOption?: string | undefined;
                enabled?: boolean | undefined;
            }, {
                price: number;
                currency: string;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                paymentOption?: string | undefined;
                enabled?: boolean | undefined;
            }>>;
            "pipedrive-crm": z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            plausible: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                PLAUSIBLE_URL: z.ZodUnion<[z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodUndefined]>;
                trackingId: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                PLAUSIBLE_URL?: string | undefined;
                trackingId?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                PLAUSIBLE_URL?: string | undefined;
                trackingId?: string | undefined;
            }>>;
            posthog: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                TRACKING_ID: z.ZodOptional<z.ZodString>;
                API_HOST: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                TRACKING_ID?: string | undefined;
                API_HOST?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                TRACKING_ID?: string | undefined;
                API_HOST?: string | undefined;
            }>>;
            qr_code: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            "routing-forms": z.ZodOptional<z.ZodAny>;
            salesforce: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                roundRobinLeadSkip: z.ZodOptional<z.ZodBoolean>;
                skipContactCreation: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                roundRobinLeadSkip?: boolean | undefined;
                skipContactCreation?: boolean | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                roundRobinLeadSkip?: boolean | undefined;
                skipContactCreation?: boolean | undefined;
            }>>;
            shimmervideo: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            stripe: z.ZodOptional<z.ZodObject<{
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                price: z.ZodNumber;
                currency: z.ZodString;
                paymentOption: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
                enabled: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                price: number;
                currency: string;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                paymentOption?: string | undefined;
                enabled?: boolean | undefined;
            }, {
                price: number;
                currency: string;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                paymentOption?: string | undefined;
                enabled?: boolean | undefined;
            }>>;
            tandemvideo: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            "booking-pages-tag": z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                trackingId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                trackingId: string;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                trackingId: string;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            "event-type-app-card": z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                isSunrise: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                isSunrise: boolean;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                isSunrise: boolean;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            twipla: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                SITE_ID: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                SITE_ID?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                SITE_ID?: string | undefined;
            }>>;
            umami: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                SITE_ID: z.ZodOptional<z.ZodString>;
                SCRIPT_URL: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                SITE_ID?: string | undefined;
                SCRIPT_URL?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
                SITE_ID?: string | undefined;
                SCRIPT_URL?: string | undefined;
            }>>;
            vital: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            webex: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            wordpress: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                isSunrise: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                isSunrise: boolean;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                isSunrise: boolean;
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            zapier: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            "zoho-bigin": z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            zohocalendar: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            zohocrm: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                credentialId: z.ZodOptional<z.ZodNumber>;
                appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }, {
                enabled?: boolean | undefined;
                credentialId?: number | undefined;
                appCategories?: string[] | undefined;
            }>>;
            zoomvideo: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
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
        }, {
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
        }>>;
        additionalNotesRequired: z.ZodOptional<z.ZodBoolean>;
        disableSuccessPage: z.ZodOptional<z.ZodBoolean>;
        disableStandardEmails: z.ZodOptional<z.ZodObject<{
            all: z.ZodOptional<z.ZodObject<{
                host: z.ZodOptional<z.ZodBoolean>;
                attendee: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            }, {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            }>>;
            confirmation: z.ZodOptional<z.ZodObject<{
                host: z.ZodOptional<z.ZodBoolean>;
                attendee: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            }, {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            all?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
            confirmation?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
        }, {
            all?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
            confirmation?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
        }>>;
        managedEventConfig: z.ZodOptional<z.ZodObject<{
            unlockedFields: z.ZodOptional<z.ZodType<{
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            }, z.ZodTypeDef, {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            unlockedFields?: {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            } | undefined;
        }, {
            unlockedFields?: {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            } | undefined;
        }>>;
        requiresConfirmationThreshold: z.ZodOptional<z.ZodObject<{
            time: z.ZodNumber;
            unit: z.ZodType<import("dayjs").UnitTypeLongPlural, z.ZodTypeDef, import("dayjs").UnitTypeLongPlural>;
        }, "strip", z.ZodTypeAny, {
            time: number;
            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
        }, {
            time: number;
            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
        }>>;
        config: z.ZodOptional<z.ZodObject<{
            useHostSchedulesForTeamEvent: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            useHostSchedulesForTeamEvent?: boolean | undefined;
        }, {
            useHostSchedulesForTeamEvent?: boolean | undefined;
        }>>;
        bookerLayouts: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            enabledLayouts: z.ZodArray<z.ZodUnion<[z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>]>, "many">;
            defaultLayout: z.ZodUnion<[z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>, z.ZodLiteral<import("@calcom/prisma/zod-utils").BookerLayouts>]>;
        }, "strip", z.ZodTypeAny, {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        }, {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        smartContractAddress?: string | undefined;
        blockchainId?: number | undefined;
        multipleDuration?: number[] | undefined;
        giphyThankYouPage?: string | undefined;
        apps?: {
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
        } | undefined;
        additionalNotesRequired?: boolean | undefined;
        disableSuccessPage?: boolean | undefined;
        disableStandardEmails?: {
            all?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
            confirmation?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
        } | undefined;
        managedEventConfig?: {
            unlockedFields?: {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            } | undefined;
        } | undefined;
        requiresConfirmationThreshold?: {
            time: number;
            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
        } | undefined;
        config?: {
            useHostSchedulesForTeamEvent?: boolean | undefined;
        } | undefined;
        bookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
    }, {
        smartContractAddress?: string | undefined;
        blockchainId?: number | undefined;
        multipleDuration?: number[] | undefined;
        giphyThankYouPage?: string | undefined;
        apps?: {
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
        } | undefined;
        additionalNotesRequired?: boolean | undefined;
        disableSuccessPage?: boolean | undefined;
        disableStandardEmails?: {
            all?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
            confirmation?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
        } | undefined;
        managedEventConfig?: {
            unlockedFields?: {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            } | undefined;
        } | undefined;
        requiresConfirmationThreshold?: {
            time: number;
            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
        } | undefined;
        config?: {
            useHostSchedulesForTeamEvent?: boolean | undefined;
        } | undefined;
        bookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    length: number;
    title: string;
    slug: string;
    description?: string | null | undefined;
    locations?: {
        type: string;
        address?: string | undefined;
        link?: string | undefined;
        displayLocationPublicly?: boolean | undefined;
        hostPhoneNumber?: string | undefined;
        credentialId?: number | undefined;
        teamName?: string | undefined;
    }[] | undefined;
    hidden?: boolean | undefined;
    teamId?: number | null | undefined;
    disableGuests?: boolean | undefined;
    minimumBookingNotice?: number | undefined;
    beforeEventBuffer?: number | undefined;
    afterEventBuffer?: number | undefined;
    schedulingType?: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null | undefined;
    scheduleId?: number | undefined;
    slotInterval?: number | null | undefined;
    metadata?: {
        smartContractAddress?: string | undefined;
        blockchainId?: number | undefined;
        multipleDuration?: number[] | undefined;
        giphyThankYouPage?: string | undefined;
        apps?: {
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
        } | undefined;
        additionalNotesRequired?: boolean | undefined;
        disableSuccessPage?: boolean | undefined;
        disableStandardEmails?: {
            all?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
            confirmation?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
        } | undefined;
        managedEventConfig?: {
            unlockedFields?: {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            } | undefined;
        } | undefined;
        requiresConfirmationThreshold?: {
            time: number;
            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
        } | undefined;
        config?: {
            useHostSchedulesForTeamEvent?: boolean | undefined;
        } | undefined;
        bookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
    } | null | undefined;
}, {
    length: number;
    title: string;
    slug: string;
    description?: string | null | undefined;
    locations?: {
        type: string;
        address?: string | undefined;
        link?: string | undefined;
        displayLocationPublicly?: boolean | undefined;
        hostPhoneNumber?: string | undefined;
        credentialId?: number | undefined;
        teamName?: string | undefined;
    }[] | undefined;
    hidden?: boolean | undefined;
    teamId?: number | null | undefined;
    disableGuests?: boolean | undefined;
    minimumBookingNotice?: number | undefined;
    beforeEventBuffer?: number | undefined;
    afterEventBuffer?: number | undefined;
    schedulingType?: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null | undefined;
    scheduleId?: number | undefined;
    slotInterval?: number | null | undefined;
    metadata?: {
        smartContractAddress?: string | undefined;
        blockchainId?: number | undefined;
        multipleDuration?: number[] | undefined;
        giphyThankYouPage?: string | undefined;
        apps?: {
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
        } | undefined;
        additionalNotesRequired?: boolean | undefined;
        disableSuccessPage?: boolean | undefined;
        disableStandardEmails?: {
            all?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
            confirmation?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
        } | undefined;
        managedEventConfig?: {
            unlockedFields?: {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            } | undefined;
        } | undefined;
        requiresConfirmationThreshold?: {
            time: number;
            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
        } | undefined;
        config?: {
            useHostSchedulesForTeamEvent?: boolean | undefined;
        } | undefined;
        bookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
    } | null | undefined;
}>, {
    length: number;
    title: string;
    slug: string;
    description?: string | null | undefined;
    locations?: {
        type: string;
        address?: string | undefined;
        link?: string | undefined;
        displayLocationPublicly?: boolean | undefined;
        hostPhoneNumber?: string | undefined;
        credentialId?: number | undefined;
        teamName?: string | undefined;
    }[] | undefined;
    hidden?: boolean | undefined;
    teamId?: number | null | undefined;
    disableGuests?: boolean | undefined;
    minimumBookingNotice?: number | undefined;
    beforeEventBuffer?: number | undefined;
    afterEventBuffer?: number | undefined;
    schedulingType?: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null | undefined;
    scheduleId?: number | undefined;
    slotInterval?: number | null | undefined;
    metadata?: {
        smartContractAddress?: string | undefined;
        blockchainId?: number | undefined;
        multipleDuration?: number[] | undefined;
        giphyThankYouPage?: string | undefined;
        apps?: {
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
        } | undefined;
        additionalNotesRequired?: boolean | undefined;
        disableSuccessPage?: boolean | undefined;
        disableStandardEmails?: {
            all?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
            confirmation?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
        } | undefined;
        managedEventConfig?: {
            unlockedFields?: {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            } | undefined;
        } | undefined;
        requiresConfirmationThreshold?: {
            time: number;
            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
        } | undefined;
        config?: {
            useHostSchedulesForTeamEvent?: boolean | undefined;
        } | undefined;
        bookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
    } | null | undefined;
}, {
    length: number;
    title: string;
    slug: string;
    description?: string | null | undefined;
    locations?: {
        type: string;
        address?: string | undefined;
        link?: string | undefined;
        displayLocationPublicly?: boolean | undefined;
        hostPhoneNumber?: string | undefined;
        credentialId?: number | undefined;
        teamName?: string | undefined;
    }[] | undefined;
    hidden?: boolean | undefined;
    teamId?: number | null | undefined;
    disableGuests?: boolean | undefined;
    minimumBookingNotice?: number | undefined;
    beforeEventBuffer?: number | undefined;
    afterEventBuffer?: number | undefined;
    schedulingType?: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null | undefined;
    scheduleId?: number | undefined;
    slotInterval?: number | null | undefined;
    metadata?: {
        smartContractAddress?: string | undefined;
        blockchainId?: number | undefined;
        multipleDuration?: number[] | undefined;
        giphyThankYouPage?: string | undefined;
        apps?: {
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
        } | undefined;
        additionalNotesRequired?: boolean | undefined;
        disableSuccessPage?: boolean | undefined;
        disableStandardEmails?: {
            all?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
            confirmation?: {
                host?: boolean | undefined;
                attendee?: boolean | undefined;
            } | undefined;
        } | undefined;
        managedEventConfig?: {
            unlockedFields?: {
                length?: true | undefined;
                title?: true | undefined;
                slug?: true | undefined;
                description?: true | undefined;
                position?: true | undefined;
                locations?: true | undefined;
                offsetStart?: true | undefined;
                hidden?: true | undefined;
                userId?: true | undefined;
                profileId?: true | undefined;
                teamId?: true | undefined;
                eventName?: true | undefined;
                parentId?: true | undefined;
                bookingFields?: true | undefined;
                timeZone?: true | undefined;
                periodType?: true | undefined;
                periodStartDate?: true | undefined;
                periodEndDate?: true | undefined;
                periodDays?: true | undefined;
                periodCountCalendarDays?: true | undefined;
                lockTimeZoneToggleOnBookingPage?: true | undefined;
                requiresConfirmation?: true | undefined;
                requiresConfirmationWillBlockSlot?: true | undefined;
                requiresBookerEmailVerification?: true | undefined;
                recurringEvent?: true | undefined;
                disableGuests?: true | undefined;
                hideCalendarNotes?: true | undefined;
                minimumBookingNotice?: true | undefined;
                beforeEventBuffer?: true | undefined;
                afterEventBuffer?: true | undefined;
                seatsPerTimeSlot?: true | undefined;
                onlyShowFirstAvailableSlot?: true | undefined;
                seatsShowAttendees?: true | undefined;
                seatsShowAvailabilityCount?: true | undefined;
                schedulingType?: true | undefined;
                scheduleId?: true | undefined;
                price?: true | undefined;
                currency?: true | undefined;
                slotInterval?: true | undefined;
                metadata?: true | undefined;
                successRedirectUrl?: true | undefined;
                forwardParamsSuccessRedirect?: true | undefined;
                bookingLimits?: true | undefined;
                durationLimits?: true | undefined;
                isInstantEvent?: true | undefined;
                instantMeetingExpiryTimeOffsetInSeconds?: true | undefined;
                instantMeetingScheduleId?: true | undefined;
                assignAllTeamMembers?: true | undefined;
                useEventTypeDestinationCalendarEmail?: true | undefined;
                isRRWeightsEnabled?: true | undefined;
                eventTypeColor?: true | undefined;
                rescheduleWithSameRoundRobinHost?: true | undefined;
                secondaryEmailId?: true | undefined;
                hosts?: true | undefined;
                users?: true | undefined;
                owner?: true | undefined;
                profile?: true | undefined;
                team?: true | undefined;
                hashedLink?: true | undefined;
                bookings?: true | undefined;
                availability?: true | undefined;
                webhooks?: true | undefined;
                destinationCalendar?: true | undefined;
                customInputs?: true | undefined;
                parent?: true | undefined;
                children?: true | undefined;
                schedule?: true | undefined;
                workflows?: true | undefined;
                instantMeetingSchedule?: true | undefined;
                aiPhoneCallConfig?: true | undefined;
                secondaryEmail?: true | undefined;
                _count?: true | undefined;
            } | undefined;
        } | undefined;
        requiresConfirmationThreshold?: {
            time: number;
            unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates";
        } | undefined;
        config?: {
            useHostSchedulesForTeamEvent?: boolean | undefined;
        } | undefined;
        bookerLayouts?: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null | undefined;
    } | null | undefined;
}>;
export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
