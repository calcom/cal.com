export declare const appDataSchemas: {
    alby: import("zod").ZodObject<{
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
    }, "strip", import("zod").ZodTypeAny, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }>;
    basecamp3: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    btcpayserver: import("zod").ZodObject<{
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
    }, "strip", import("zod").ZodTypeAny, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }>;
    closecom: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    dailyvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    databuddy: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        DATABUDDY_SCRIPT_URL: import("zod").ZodUnion<[import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodString>>, import("zod").ZodUndefined]>;
        DATABUDDY_API_URL: import("zod").ZodUnion<[import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodString>>, import("zod").ZodUndefined]>;
        CLIENT_ID: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        DATABUDDY_SCRIPT_URL?: string | undefined;
        DATABUDDY_API_URL?: string | undefined;
        CLIENT_ID?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        DATABUDDY_SCRIPT_URL?: string | undefined;
        DATABUDDY_API_URL?: string | undefined;
        CLIENT_ID?: string | undefined;
    }>;
    dub: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    fathom: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }>;
    feishucalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    ga4: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }>;
    giphy: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        thankYouPage: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        thankYouPage?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        thankYouPage?: string | undefined;
    }>;
    googlecalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    googlevideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    gtm: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        trackingId: import("zod").ZodEffects<import("zod").ZodString, string, string>;
    }, "strip", import("zod").ZodTypeAny, {
        trackingId: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        trackingId: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    hitpay: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }>;
    hubspot: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        ignoreGuests: import("zod").ZodOptional<import("zod").ZodBoolean>;
        skipContactCreation: import("zod").ZodOptional<import("zod").ZodBoolean>;
        setOrganizerAsOwner: import("zod").ZodOptional<import("zod").ZodBoolean>;
        overwriteContactOwner: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onBookingWriteToEventObject: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onBookingWriteToEventObjectFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodObject<{
            value: import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodBoolean]>;
            fieldType: import("zod").ZodNativeEnum<typeof import("./_lib/crm-enums").CrmFieldType>;
            whenToWrite: import("zod").ZodNativeEnum<typeof import("./_lib/crm-enums").WhenToWrite>;
        }, "strip", import("zod").ZodTypeAny, {
            value: string | boolean;
            fieldType: import("./_lib/crm-enums").CrmFieldType;
            whenToWrite: import("./_lib/crm-enums").WhenToWrite;
        }, {
            value: string | boolean;
            fieldType: import("./_lib/crm-enums").CrmFieldType;
            whenToWrite: import("./_lib/crm-enums").WhenToWrite;
        }>>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        skipContactCreation?: boolean | undefined;
        onBookingWriteToEventObject?: boolean | undefined;
        ignoreGuests?: boolean | undefined;
        setOrganizerAsOwner?: boolean | undefined;
        overwriteContactOwner?: boolean | undefined;
        onBookingWriteToEventObjectFields?: Record<string, {
            value: string | boolean;
            fieldType: import("./_lib/crm-enums").CrmFieldType;
            whenToWrite: import("./_lib/crm-enums").WhenToWrite;
        }> | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        skipContactCreation?: boolean | undefined;
        onBookingWriteToEventObject?: boolean | undefined;
        ignoreGuests?: boolean | undefined;
        setOrganizerAsOwner?: boolean | undefined;
        overwriteContactOwner?: boolean | undefined;
        onBookingWriteToEventObjectFields?: Record<string, {
            value: string | boolean;
            fieldType: import("./_lib/crm-enums").CrmFieldType;
            whenToWrite: import("./_lib/crm-enums").WhenToWrite;
        }> | undefined;
    }>;
    insihts: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
        SCRIPT_URL: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
        SCRIPT_URL?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
        SCRIPT_URL?: string | undefined;
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
    } & {
        MATOMO_URL: import("zod").ZodOptional<import("zod").ZodString>;
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
        MATOMO_URL?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
        MATOMO_URL?: string | undefined;
    }>;
    metapixel: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
    }>;
    "mock-payment-app": import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }>;
    nextcloudtalk: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
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
    } & {
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodString>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, "strip", import("zod").ZodTypeAny, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
    }>;
    "pipedrive-crm": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    plausible: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        PLAUSIBLE_URL: import("zod").ZodUnion<[import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodString>>, import("zod").ZodUndefined]>;
        trackingId: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodString>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
        PLAUSIBLE_URL?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        trackingId?: string | undefined;
        PLAUSIBLE_URL?: string | undefined;
    }>;
    posthog: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        TRACKING_ID: import("zod").ZodOptional<import("zod").ZodString>;
        API_HOST: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        TRACKING_ID?: string | undefined;
        API_HOST?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        TRACKING_ID?: string | undefined;
        API_HOST?: string | undefined;
    }>;
    qr_code: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    "routing-forms": import("zod").ZodAny;
    salesforce: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        roundRobinLeadSkip: import("zod").ZodOptional<import("zod").ZodBoolean>;
        roundRobinSkipCheckRecordOn: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodNativeEnum<typeof import("salesforce/lib/enums").SalesforceRecordEnum>>>;
        ifFreeEmailDomainSkipOwnerCheck: import("zod").ZodOptional<import("zod").ZodBoolean>;
        roundRobinSkipFallbackToLeadOwner: import("zod").ZodOptional<import("zod").ZodBoolean>;
        skipContactCreation: import("zod").ZodOptional<import("zod").ZodBoolean>;
        createEventOn: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodNativeEnum<typeof import("salesforce/lib/enums").SalesforceRecordEnum>>>;
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
            fieldType: import("zod").ZodNativeEnum<typeof import("salesforce/lib/enums").SalesforceFieldType>;
            whenToWrite: import("zod").ZodNativeEnum<typeof import("salesforce/lib/enums").WhenToWriteToRecord>;
        }, "strip", import("zod").ZodTypeAny, {
            value: string | boolean;
            fieldType: import("salesforce/lib/enums").SalesforceFieldType;
            whenToWrite: import("salesforce/lib/enums").WhenToWriteToRecord;
        }, {
            value: string | boolean;
            fieldType: import("salesforce/lib/enums").SalesforceFieldType;
            whenToWrite: import("salesforce/lib/enums").WhenToWriteToRecord;
        }>>>;
        ignoreGuests: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onCancelWriteToEventRecord: import("zod").ZodOptional<import("zod").ZodBoolean>;
        onCancelWriteToEventRecordFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodObject<{
            value: import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodBoolean]>;
            fieldType: import("zod").ZodNativeEnum<typeof import("salesforce/lib/enums").SalesforceFieldType>;
            whenToWrite: import("zod").ZodNativeEnum<typeof import("salesforce/lib/enums").WhenToWriteToRecord>;
        }, "strip", import("zod").ZodTypeAny, {
            value: string | boolean;
            fieldType: import("salesforce/lib/enums").SalesforceFieldType;
            whenToWrite: import("salesforce/lib/enums").WhenToWriteToRecord;
        }, {
            value: string | boolean;
            fieldType: import("salesforce/lib/enums").SalesforceFieldType;
            whenToWrite: import("salesforce/lib/enums").WhenToWriteToRecord;
        }>>>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        roundRobinLeadSkip?: boolean | undefined;
        roundRobinSkipCheckRecordOn?: import("salesforce/lib/enums").SalesforceRecordEnum | undefined;
        ifFreeEmailDomainSkipOwnerCheck?: boolean | undefined;
        roundRobinSkipFallbackToLeadOwner?: boolean | undefined;
        skipContactCreation?: boolean | undefined;
        createEventOn?: import("salesforce/lib/enums").SalesforceRecordEnum | undefined;
        createNewContactUnderAccount?: boolean | undefined;
        createLeadIfAccountNull?: boolean | undefined;
        onBookingWriteToEventObject?: boolean | undefined;
        onBookingWriteToEventObjectMap?: Record<string, any> | undefined;
        createEventOnLeadCheckForContact?: boolean | undefined;
        onBookingChangeRecordOwner?: boolean | undefined;
        onBookingChangeRecordOwnerName?: string | undefined;
        sendNoShowAttendeeData?: boolean | undefined;
        sendNoShowAttendeeDataField?: string | undefined;
        onBookingWriteToRecord?: boolean | undefined;
        onBookingWriteToRecordFields?: Record<string, {
            value: string | boolean;
            fieldType: import("salesforce/lib/enums").SalesforceFieldType;
            whenToWrite: import("salesforce/lib/enums").WhenToWriteToRecord;
        }> | undefined;
        ignoreGuests?: boolean | undefined;
        onCancelWriteToEventRecord?: boolean | undefined;
        onCancelWriteToEventRecordFields?: Record<string, {
            value: string | boolean;
            fieldType: import("salesforce/lib/enums").SalesforceFieldType;
            whenToWrite: import("salesforce/lib/enums").WhenToWriteToRecord;
        }> | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        roundRobinLeadSkip?: boolean | undefined;
        roundRobinSkipCheckRecordOn?: import("salesforce/lib/enums").SalesforceRecordEnum | undefined;
        ifFreeEmailDomainSkipOwnerCheck?: boolean | undefined;
        roundRobinSkipFallbackToLeadOwner?: boolean | undefined;
        skipContactCreation?: boolean | undefined;
        createEventOn?: import("salesforce/lib/enums").SalesforceRecordEnum | undefined;
        createNewContactUnderAccount?: boolean | undefined;
        createLeadIfAccountNull?: boolean | undefined;
        onBookingWriteToEventObject?: boolean | undefined;
        onBookingWriteToEventObjectMap?: Record<string, any> | undefined;
        createEventOnLeadCheckForContact?: boolean | undefined;
        onBookingChangeRecordOwner?: boolean | undefined;
        onBookingChangeRecordOwnerName?: string | undefined;
        sendNoShowAttendeeData?: boolean | undefined;
        sendNoShowAttendeeDataField?: string | undefined;
        onBookingWriteToRecord?: boolean | undefined;
        onBookingWriteToRecordFields?: Record<string, {
            value: string | boolean;
            fieldType: import("salesforce/lib/enums").SalesforceFieldType;
            whenToWrite: import("salesforce/lib/enums").WhenToWriteToRecord;
        }> | undefined;
        ignoreGuests?: boolean | undefined;
        onCancelWriteToEventRecord?: boolean | undefined;
        onCancelWriteToEventRecordFields?: Record<string, {
            value: string | boolean;
            fieldType: import("salesforce/lib/enums").SalesforceFieldType;
            whenToWrite: import("salesforce/lib/enums").WhenToWriteToRecord;
        }> | undefined;
    }>;
    shimmervideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    stripe: import("zod").ZodObject<{
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        price: import("zod").ZodNumber;
        currency: import("zod").ZodString;
        paymentOption: import("zod").ZodOptional<import("zod").ZodEnum<[string, ...string[]]>>;
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        refundPolicy: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("@calcom/lib/payment/types").RefundPolicy>>;
        refundDaysCount: import("zod").ZodOptional<import("zod").ZodNumber>;
        refundCountCalendarDays: import("zod").ZodOptional<import("zod").ZodBoolean>;
        autoChargeNoShowFeeIfCancelled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        autoChargeNoShowFeeTimeValue: import("zod").ZodOptional<import("zod").ZodNumber>;
        autoChargeNoShowFeeTimeUnit: import("zod").ZodOptional<import("zod").ZodEnum<["minutes", "hours", "days"]>>;
    }, "strip", import("zod").ZodTypeAny, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
        refundPolicy?: import("@calcom/lib/payment/types").RefundPolicy | undefined;
        refundDaysCount?: number | undefined;
        refundCountCalendarDays?: boolean | undefined;
        autoChargeNoShowFeeIfCancelled?: boolean | undefined;
        autoChargeNoShowFeeTimeValue?: number | undefined;
        autoChargeNoShowFeeTimeUnit?: "minutes" | "hours" | "days" | undefined;
    }, {
        price: number;
        currency: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        paymentOption?: string | undefined;
        refundPolicy?: import("@calcom/lib/payment/types").RefundPolicy | undefined;
        refundDaysCount?: number | undefined;
        refundCountCalendarDays?: boolean | undefined;
        autoChargeNoShowFeeIfCancelled?: boolean | undefined;
        autoChargeNoShowFeeTimeValue?: number | undefined;
        autoChargeNoShowFeeTimeUnit?: "minutes" | "hours" | "days" | undefined;
    }>;
    tandemvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "booking-pages-tag": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        trackingId: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        trackingId: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        trackingId: string;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    "event-type-app-card": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        isSunrise: import("zod").ZodBoolean;
    }, "strip", import("zod").ZodTypeAny, {
        isSunrise: boolean;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        isSunrise: boolean;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    twipla: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
    }>;
    umami: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    } & {
        SITE_ID: import("zod").ZodOptional<import("zod").ZodString>;
        SCRIPT_URL: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
        SITE_ID?: string | undefined;
        SCRIPT_URL?: string | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
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
    } & {
        isSunrise: import("zod").ZodBoolean;
    }, "strip", import("zod").ZodTypeAny, {
        isSunrise: boolean;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        isSunrise: boolean;
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    zapier: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    "zoho-bigin": import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    zohocalendar: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
    zohocrm: import("zod").ZodObject<{
        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
        credentialId: import("zod").ZodOptional<import("zod").ZodNumber>;
        appCategories: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    }, "strip", import("zod").ZodTypeAny, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }, {
        credentialId?: number | undefined;
        enabled?: boolean | undefined;
        appCategories?: string[] | undefined;
    }>;
    zoomvideo: import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>;
};
//# sourceMappingURL=apps.schemas.generated.d.ts.map