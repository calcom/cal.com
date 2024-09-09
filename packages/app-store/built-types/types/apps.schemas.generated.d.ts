export declare const appDataSchemas: {
    alby: import("zod").ZodObject<{
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    basecamp3: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    campsite: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    closecom: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    dailyvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    fathom: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }>;
    feishucalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    ga4: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }>;
    giphy: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        thankYouPage: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        thankYouPage?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        thankYouPage?: string | undefined;
    }>;
    googlecalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    googlevideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    gtm: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodEffects<import("zod").ZodString, string, string>;
    }, "strip", import("zod").ZodTypeAny, {
        trackingId: string;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        trackingId: string;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    hubspot: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    intercom: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    jelly: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    jitsivideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    larkcalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    make: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    matomo: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        MATOMO_URL: import("zod").ZodOptional<import("zod").ZodString>;
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    metapixel: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }>;
    "mock-payment-app": import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    office365calendar: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    office365video: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    paypal: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    "pipedrive-crm": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    plausible: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        PLAUSIBLE_URL: import("zod").ZodUnion<[import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodString>>, import("zod").ZodUndefined]>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    posthog: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        TRACKING_ID: import("zod").ZodOptional<import("zod").ZodString>;
        API_HOST: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    qr_code: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    "routing-forms": import("zod").ZodAny;
    salesforce: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        roundRobinLeadSkip: import("zod").ZodOptional<import("zod").ZodBoolean>;
        skipContactCreation: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    shimmervideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    stripe: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodEnum<[string, ...string[]]>>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    tandemvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "booking-pages-tag": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        trackingId: string;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        trackingId: string;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    "event-type-app-card": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        isSunrise: import("zod").ZodBoolean;
    }, "strip", import("zod").ZodTypeAny, {
        isSunrise: boolean;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        isSunrise: boolean;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    twipla: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
    }>;
    umami: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
        SCRIPT_URL: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
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
    }>;
    vital: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    webex: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    wordpress: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        isSunrise: import("zod").ZodBoolean;
    }, "strip", import("zod").ZodTypeAny, {
        isSunrise: boolean;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        isSunrise: boolean;
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    zapier: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "zoho-bigin": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    zohocalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    zohocrm: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }, {
        enabled?: boolean | undefined;
        credentialId?: number | undefined;
        appCategories?: string[] | undefined;
    }>;
    zoomvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
};
//# sourceMappingURL=apps.schemas.generated.d.ts.map