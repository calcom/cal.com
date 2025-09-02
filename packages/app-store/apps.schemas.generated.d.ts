export declare const appDataSchemas: {
    alby: import("zod").ZodObject<{
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
    }, "strip", import("zod").ZodTypeAny, {
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
        credentialId?: number;
    }, {
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
        credentialId?: number;
    }>;
    basecamp3: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
    }>;
    btcpayserver: import("zod").ZodObject<{
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
    }, "strip", import("zod").ZodTypeAny, {
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
        credentialId?: number;
    }, {
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
        credentialId?: number;
    }>;
    closecom: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }>;
    dailyvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    dub: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    fathom: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }>;
    feishucalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    ga4: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }>;
    giphy: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        thankYouPage: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        thankYouPage?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        thankYouPage?: string;
    }>;
    googlecalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    googlevideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    gtm: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodEffects<import("zod").ZodString, string, string>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }>;
    hitpay: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
    }, {
        credentialId?: number;
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
    }>;
    hubspot: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }>;
    insihts: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
        SCRIPT_URL: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        SITE_ID?: string;
        SCRIPT_URL?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        SITE_ID?: string;
        SCRIPT_URL?: string;
    }>;
    intercom: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    jelly: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    jitsivideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    larkcalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    make: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    matomo: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        MATOMO_URL: import("zod").ZodOptional<import("zod").ZodString>;
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        MATOMO_URL?: string;
        SITE_ID?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        MATOMO_URL?: string;
        SITE_ID?: string;
    }>;
    metapixel: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }>;
    "mock-payment-app": import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
    }, {
        credentialId?: number;
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
    }>;
    nextcloudtalk: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    office365calendar: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id?: string;
        client_secret?: string;
    }, {
        client_id?: string;
        client_secret?: string;
    }>;
    office365video: import("zod").ZodObject<{
        client_id: import("zod").ZodString;
        client_secret: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        client_id?: string;
        client_secret?: string;
    }, {
        client_id?: string;
        client_secret?: string;
    }>;
    paypal: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
    }, {
        credentialId?: number;
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
    }>;
    "pipedrive-crm": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }>;
    plausible: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        PLAUSIBLE_URL: import("zod").ZodUnion<[import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodString>>, import("zod").ZodUndefined]>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        PLAUSIBLE_URL?: string;
        trackingId?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        PLAUSIBLE_URL?: string;
        trackingId?: string;
    }>;
    posthog: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        TRACKING_ID: import("zod").ZodOptional<import("zod").ZodString>;
        API_HOST: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        TRACKING_ID?: string;
        API_HOST?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        TRACKING_ID?: string;
        API_HOST?: string;
    }>;
    qr_code: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }>;
    "routing-forms": import("zod").ZodAny;
    salesforce: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        roundRobinLeadSkip: import("zod").ZodOptional<import("zod").ZodBoolean>;
        roundRobinSkipCheckRecordOn: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodNativeEnum<typeof import("./salesforce/lib/enums").SalesforceRecordEnum>>>;
        ifFreeEmailDomainSkipOwnerCheck: import("zod").ZodOptional<import("zod").ZodBoolean>;
        roundRobinSkipFallbackToLeadOwner: import("zod").ZodOptional<import("zod").ZodBoolean>;
        skipContactCreation: import("zod").ZodOptional<import("zod").ZodBoolean>;
        createEventOn: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodNativeEnum<typeof import("./salesforce/lib/enums").SalesforceRecordEnum>>>;
        createNewContactUnderAccount: import("zod").ZodOptional<import("zod").ZodBoolean>;
        createLeadIfAccountNull: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onBookingWriteToEventObject: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onBookingWriteToEventObjectMap: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
        createEventOnLeadCheckForContact: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onBookingChangeRecordOwner: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onBookingChangeRecordOwnerName: import("zod").ZodOptional<import("zod").ZodString>;
        sendNoShowAttendeeData: import("zod").ZodOptional<import("zod").ZodBoolean>;
        sendNoShowAttendeeDataField: import("zod").ZodOptional<import("zod").ZodString>;
        onBookingWriteToRecord: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onBookingWriteToRecordFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodObject<{
            value: import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodBoolean]>;
            fieldType: import("zod").ZodNativeEnum<typeof import("./salesforce/lib/enums").SalesforceFieldType>;
            whenToWrite: import("zod").ZodNativeEnum<typeof import("./salesforce/lib/enums").WhenToWriteToRecord>;
        }, "strip", import("zod").ZodTypeAny, {
            value?: string | boolean;
            fieldType?: import("./salesforce/lib/enums").SalesforceFieldType;
            whenToWrite?: import("./salesforce/lib/enums").WhenToWriteToRecord;
        }, {
            value?: string | boolean;
            fieldType?: import("./salesforce/lib/enums").SalesforceFieldType;
            whenToWrite?: import("./salesforce/lib/enums").WhenToWriteToRecord;
        }>>>;
        ignoreGuests: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onCancelWriteToEventRecord: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onCancelWriteToEventRecordFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodObject<{
            value: import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodBoolean]>;
            fieldType: import("zod").ZodNativeEnum<typeof import("./salesforce/lib/enums").SalesforceFieldType>;
            whenToWrite: import("zod").ZodNativeEnum<typeof import("./salesforce/lib/enums").WhenToWriteToRecord>;
        }, "strip", import("zod").ZodTypeAny, {
            value?: string | boolean;
            fieldType?: import("./salesforce/lib/enums").SalesforceFieldType;
            whenToWrite?: import("./salesforce/lib/enums").WhenToWriteToRecord;
        }, {
            value?: string | boolean;
            fieldType?: import("./salesforce/lib/enums").SalesforceFieldType;
            whenToWrite?: import("./salesforce/lib/enums").WhenToWriteToRecord;
        }>>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        roundRobinLeadSkip?: boolean;
        roundRobinSkipCheckRecordOn?: import("./salesforce/lib/enums").SalesforceRecordEnum;
        ifFreeEmailDomainSkipOwnerCheck?: boolean;
        roundRobinSkipFallbackToLeadOwner?: boolean;
        skipContactCreation?: boolean;
        createEventOn?: import("./salesforce/lib/enums").SalesforceRecordEnum;
        createNewContactUnderAccount?: boolean;
        createLeadIfAccountNull?: boolean;
        onBookingWriteToEventObject?: boolean;
        onBookingWriteToEventObjectMap?: Record<string, any>;
        createEventOnLeadCheckForContact?: boolean;
        onBookingChangeRecordOwner?: boolean;
        onBookingChangeRecordOwnerName?: string;
        sendNoShowAttendeeData?: boolean;
        sendNoShowAttendeeDataField?: string;
        onBookingWriteToRecord?: boolean;
        onBookingWriteToRecordFields?: Record<string, {
            value?: string | boolean;
            fieldType?: import("./salesforce/lib/enums").SalesforceFieldType;
            whenToWrite?: import("./salesforce/lib/enums").WhenToWriteToRecord;
        }>;
        ignoreGuests?: boolean;
        onCancelWriteToEventRecord?: boolean;
        onCancelWriteToEventRecordFields?: Record<string, {
            value?: string | boolean;
            fieldType?: import("./salesforce/lib/enums").SalesforceFieldType;
            whenToWrite?: import("./salesforce/lib/enums").WhenToWriteToRecord;
        }>;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        roundRobinLeadSkip?: boolean;
        roundRobinSkipCheckRecordOn?: import("./salesforce/lib/enums").SalesforceRecordEnum;
        ifFreeEmailDomainSkipOwnerCheck?: boolean;
        roundRobinSkipFallbackToLeadOwner?: boolean;
        skipContactCreation?: boolean;
        createEventOn?: import("./salesforce/lib/enums").SalesforceRecordEnum;
        createNewContactUnderAccount?: boolean;
        createLeadIfAccountNull?: boolean;
        onBookingWriteToEventObject?: boolean;
        onBookingWriteToEventObjectMap?: Record<string, any>;
        createEventOnLeadCheckForContact?: boolean;
        onBookingChangeRecordOwner?: boolean;
        onBookingChangeRecordOwnerName?: string;
        sendNoShowAttendeeData?: boolean;
        sendNoShowAttendeeDataField?: string;
        onBookingWriteToRecord?: boolean;
        onBookingWriteToRecordFields?: Record<string, {
            value?: string | boolean;
            fieldType?: import("./salesforce/lib/enums").SalesforceFieldType;
            whenToWrite?: import("./salesforce/lib/enums").WhenToWriteToRecord;
        }>;
        ignoreGuests?: boolean;
        onCancelWriteToEventRecord?: boolean;
        onCancelWriteToEventRecordFields?: Record<string, {
            value?: string | boolean;
            fieldType?: import("./salesforce/lib/enums").SalesforceFieldType;
            whenToWrite?: import("./salesforce/lib/enums").WhenToWriteToRecord;
        }>;
    }>;
    shimmervideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    stripe: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodEnum<[string, ...string[]]>>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        refundPolicy: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("@calcom/lib/payment/types").RefundPolicy>>;
        refundDaysCount: import("zod").ZodOptional<import("zod").ZodNumber>;
        refundCountCalendarDays: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
        refundPolicy?: import("@calcom/lib/payment/types").RefundPolicy;
        refundDaysCount?: number;
        refundCountCalendarDays?: boolean;
    }, {
        credentialId?: number;
        appCategories?: string[];
        price?: number;
        currency?: string;
        paymentOption?: string;
        enabled?: boolean;
        refundPolicy?: import("@calcom/lib/payment/types").RefundPolicy;
        refundDaysCount?: number;
        refundCountCalendarDays?: boolean;
    }>;
    tandemvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "booking-pages-tag": import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        trackingId: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        trackingId?: string;
    }>;
    "event-type-app-card": import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        isSunrise: import("zod").ZodBoolean;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        isSunrise?: boolean;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        isSunrise?: boolean;
    }>;
    twipla: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        SITE_ID?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        SITE_ID?: string;
    }>;
    umami: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
        SCRIPT_URL: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        SITE_ID?: string;
        SCRIPT_URL?: string;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        SITE_ID?: string;
        SCRIPT_URL?: string;
    }>;
    vital: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    webex: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    wordpress: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        isSunrise: import("zod").ZodBoolean;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        isSunrise?: boolean;
    }, {
        credentialId?: number;
        enabled?: boolean;
        appCategories?: string[];
        isSunrise?: boolean;
    }>;
    zapier: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "zoho-bigin": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }>;
    zohocalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    zohocrm: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }, {
        enabled?: boolean;
        credentialId?: number;
        appCategories?: string[];
    }>;
    zoomvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
};
