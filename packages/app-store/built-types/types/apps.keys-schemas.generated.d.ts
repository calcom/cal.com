export declare const appKeysSchemas: {
    alby: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    basecamp3: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
        user_agent: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
        user_agent: string;
    }, {
        client_id: string;
        client_secret: string;
        user_agent: string;
    }>;
    campsite: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    closecom: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    dailyvideo: import("zod").ZodObject<{
        api_key: import("zod").ZodString;
        scale_plan: import("zod").ZodDefault<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        api_key: string;
        scale_plan: string;
    }, {
        api_key: string;
        scale_plan?: string | undefined;
    }>;
    fathom: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    feishucalendar: import("zod").ZodObject<{
        app_id: import("zod").ZodString;
        app_secret: import("zod").ZodString;
        open_verfication_token: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        app_id: string;
        app_secret: string;
        open_verfication_token: string;
    }, {
        app_id: string;
        app_secret: string;
        open_verfication_token: string;
    }>;
    ga4: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    giphy: import("zod").ZodObject<{
        app_key: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        app_key: string;
    }, {
        app_key: string;
    }>;
    googlecalendar: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
        redirect_uris: import("zod").ZodUnion<[import("zod").ZodArray<import("zod").ZodString, "many">, import("zod").ZodEffects<import("zod").ZodString, string[], string>]>;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
        redirect_uris: string[];
    }, {
        client_id: string;
        client_secret: string;
        redirect_uris: (string | string[]) & (string | string[] | undefined);
    }>;
    googlevideo: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
        redirect_uris: import("zod").ZodUnion<[import("zod").ZodArray<import("zod").ZodString, "many">, import("zod").ZodEffects<import("zod").ZodString, string[], string>]>;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
        redirect_uris: string[];
    }, {
        client_id: string;
        client_secret: string;
        redirect_uris: (string | string[]) & (string | string[] | undefined);
    }>;
    gtm: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    hubspot: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    intercom: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    jelly: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    jitsivideo: import("zod").ZodObject<{
        jitsiHost: import("zod").ZodOptional<import("zod").ZodString>;
        jitsiPathPattern: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        jitsiHost?: string | undefined;
        jitsiPathPattern?: string | undefined;
    }, {
        jitsiHost?: string | undefined;
        jitsiPathPattern?: string | undefined;
    }>;
    larkcalendar: import("zod").ZodObject<{
        app_id: import("zod").ZodString;
        app_secret: import("zod").ZodString;
        open_verfication_token: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        app_id: string;
        app_secret: string;
        open_verfication_token: string;
    }, {
        app_id: string;
        app_secret: string;
        open_verfication_token: string;
    }>;
    make: import("zod").ZodObject<{
        invite_link: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        invite_link: string;
    }, {
        invite_link: string;
    }>;
    matomo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    metapixel: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "mock-payment-app": import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
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
    paypal: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "pipedrive-crm": import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    plausible: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    posthog: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    qr_code: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "routing-forms": import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    salesforce: import("zod").ZodObject<{
        consumer_key: import("zod").ZodString;
        consumer_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        consumer_key: string;
        consumer_secret: string;
    }, {
        consumer_key: string;
        consumer_secret: string;
    }>;
    shimmervideo: import("zod").ZodObject<{
        api_key: import("zod").ZodString;
        api_route: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        api_key: string;
        api_route: string;
    }, {
        api_key: string;
        api_route: string;
    }>;
    stripe: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
        public_key: import("zod").ZodString;
        webhook_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
        public_key: string;
        webhook_secret: string;
    }, {
        client_id: string;
        client_secret: string;
        public_key: string;
        webhook_secret: string;
    }>;
    tandemvideo: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
        base_url: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
        base_url: string;
    }, {
        client_id: string;
        client_secret: string;
        base_url: string;
    }>;
    "booking-pages-tag": import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "event-type-app-card": import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    twipla: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    umami: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    vital: import("zod").ZodObject<{
        mode: import("zod").ZodString;
        region: import("zod").ZodString;
        api_key: import("zod").ZodString;
        webhook_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        api_key: string;
        webhook_secret: string;
        mode: string;
        region: string;
    }, {
        api_key: string;
        webhook_secret: string;
        mode: string;
        region: string;
    }>;
    webex: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    wordpress: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    zapier: import("zod").ZodObject<{
        invite_link: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        invite_link: string;
    }, {
        invite_link: string;
    }>;
    "zoho-bigin": import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    zohocalendar: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    zohocrm: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
    zoomvideo: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id: string;
        client_secret: string;
    }, {
        client_id: string;
        client_secret: string;
    }>;
};
//# sourceMappingURL=apps.keys-schemas.generated.d.ts.map