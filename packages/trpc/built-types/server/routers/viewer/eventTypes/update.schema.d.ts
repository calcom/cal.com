import type { z } from "zod";
export declare const ZUpdateInputSchema: z.ZodObject<{
    length: z.ZodOptional<z.ZodNumber>;
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    position: z.ZodOptional<z.ZodNumber>;
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
    offsetStart: z.ZodOptional<z.ZodNumber>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    userId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    profileId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    teamId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    eventName: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    parentId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    bookingFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value: string;
            label: string;
        }, {
            value: string;
            label: string;
        }>, "many">>;
        type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
        label: z.ZodOptional<z.ZodString>;
        labelAsSafeHtml: z.ZodOptional<z.ZodString>;
        defaultLabel: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        defaultPlaceholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        getOptionsAt: z.ZodOptional<z.ZodString>;
        optionsInputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            type: z.ZodEnum<["address", "phone", "text"]>;
            required: z.ZodOptional<z.ZodBoolean>;
            placeholder: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "text" | "phone" | "address";
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }, {
            type: "text" | "phone" | "address";
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }>>>;
        minLength: z.ZodOptional<z.ZodNumber>;
        maxLength: z.ZodOptional<z.ZodNumber>;
        variant: z.ZodOptional<z.ZodString>;
        variantsConfig: z.ZodOptional<z.ZodObject<{
            variants: z.ZodRecord<z.ZodString, z.ZodObject<{
                fields: z.ZodArray<z.ZodObject<Omit<{
                    name: z.ZodEffects<z.ZodString, string, string>;
                    type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean", "url"]>;
                    label: z.ZodOptional<z.ZodString>;
                    labelAsSafeHtml: z.ZodOptional<z.ZodString>;
                    defaultLabel: z.ZodOptional<z.ZodString>;
                    placeholder: z.ZodOptional<z.ZodString>;
                    defaultPlaceholder: z.ZodOptional<z.ZodString>;
                    required: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        label: z.ZodString;
                        value: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        value: string;
                        label: string;
                    }, {
                        value: string;
                        label: string;
                    }>, "many">>;
                    getOptionsAt: z.ZodOptional<z.ZodString>;
                    optionsInputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
                        type: z.ZodEnum<["address", "phone", "text"]>;
                        required: z.ZodOptional<z.ZodBoolean>;
                        placeholder: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        type: "text" | "phone" | "address";
                        required?: boolean | undefined;
                        placeholder?: string | undefined;
                    }, {
                        type: "text" | "phone" | "address";
                        required?: boolean | undefined;
                        placeholder?: string | undefined;
                    }>>>;
                    minLength: z.ZodOptional<z.ZodNumber>;
                    maxLength: z.ZodOptional<z.ZodNumber>;
                }, "options" | "defaultLabel" | "defaultPlaceholder" | "getOptionsAt" | "optionsInputs">, "strip", z.ZodTypeAny, {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }, {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                fields: {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }[];
            }, {
                fields: {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            variants: Record<string, {
                fields: {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }[];
            }>;
        }, {
            variants: Record<string, {
                fields: {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }[];
            }>;
        }>>;
        views: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            id: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            description?: string | undefined;
        }, {
            label: string;
            id: string;
            description?: string | undefined;
        }>, "many">>;
        hideWhenJustOneOption: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        editable: z.ZodOptional<z.ZodDefault<z.ZodEnum<["system", "system-but-optional", "system-but-hidden", "user", "user-readonly"]>>>;
        sources: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodUnion<[z.ZodLiteral<"user">, z.ZodLiteral<"system">, z.ZodString]>;
            label: z.ZodString;
            editUrl: z.ZodOptional<z.ZodString>;
            fieldRequired: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            label: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }, {
            type: string;
            label: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }>, "many">>;
        disableOnPrefill: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        label?: string | undefined;
        labelAsSafeHtml?: string | undefined;
        defaultLabel?: string | undefined;
        placeholder?: string | undefined;
        defaultPlaceholder?: string | undefined;
        required?: boolean | undefined;
        getOptionsAt?: string | undefined;
        optionsInputs?: Record<string, {
            type: "text" | "phone" | "address";
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }> | undefined;
        minLength?: number | undefined;
        maxLength?: number | undefined;
        variant?: string | undefined;
        variantsConfig?: {
            variants: Record<string, {
                fields: {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }[];
            }>;
        } | undefined;
        views?: {
            label: string;
            id: string;
            description?: string | undefined;
        }[] | undefined;
        hideWhenJustOneOption?: boolean | undefined;
        hidden?: boolean | undefined;
        editable?: "user" | "system" | "system-but-optional" | "system-but-hidden" | "user-readonly" | undefined;
        sources?: {
            type: string;
            label: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }[] | undefined;
        disableOnPrefill?: boolean | undefined;
    }, {
        name: string;
        type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        label?: string | undefined;
        labelAsSafeHtml?: string | undefined;
        defaultLabel?: string | undefined;
        placeholder?: string | undefined;
        defaultPlaceholder?: string | undefined;
        required?: boolean | undefined;
        getOptionsAt?: string | undefined;
        optionsInputs?: Record<string, {
            type: "text" | "phone" | "address";
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }> | undefined;
        minLength?: number | undefined;
        maxLength?: number | undefined;
        variant?: string | undefined;
        variantsConfig?: {
            variants: Record<string, {
                fields: {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }[];
            }>;
        } | undefined;
        views?: {
            label: string;
            id: string;
            description?: string | undefined;
        }[] | undefined;
        hideWhenJustOneOption?: boolean | undefined;
        hidden?: boolean | undefined;
        editable?: "user" | "system" | "system-but-optional" | "system-but-hidden" | "user-readonly" | undefined;
        sources?: {
            type: string;
            label: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }[] | undefined;
        disableOnPrefill?: boolean | undefined;
    }>, "many">>;
    timeZone: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    periodType: z.ZodOptional<z.ZodNativeEnum<{
        UNLIMITED: "UNLIMITED";
        ROLLING: "ROLLING";
        ROLLING_WINDOW: "ROLLING_WINDOW";
        RANGE: "RANGE";
    }>>;
    periodStartDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    periodEndDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    periodDays: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    periodCountCalendarDays: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>;
    lockTimeZoneToggleOnBookingPage: z.ZodOptional<z.ZodBoolean>;
    requiresConfirmation: z.ZodOptional<z.ZodBoolean>;
    requiresConfirmationWillBlockSlot: z.ZodOptional<z.ZodBoolean>;
    requiresBookerEmailVerification: z.ZodOptional<z.ZodBoolean>;
    recurringEvent: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        dtstart: z.ZodOptional<z.ZodDate>;
        interval: z.ZodNumber;
        count: z.ZodNumber;
        freq: z.ZodNativeEnum<typeof import("@calcom/prisma/zod-utils").Frequency>;
        until: z.ZodOptional<z.ZodDate>;
        tzid: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        interval: number;
        count: number;
        freq: import("@calcom/prisma/zod-utils").Frequency;
        dtstart?: Date | undefined;
        until?: Date | undefined;
        tzid?: string | undefined;
    }, {
        interval: number;
        count: number;
        freq: import("@calcom/prisma/zod-utils").Frequency;
        dtstart?: Date | undefined;
        until?: Date | undefined;
        tzid?: string | undefined;
    }>>>;
    disableGuests: z.ZodOptional<z.ZodBoolean>;
    hideCalendarNotes: z.ZodOptional<z.ZodBoolean>;
    minimumBookingNotice: z.ZodOptional<z.ZodNumber>;
    beforeEventBuffer: z.ZodOptional<z.ZodNumber>;
    afterEventBuffer: z.ZodOptional<z.ZodNumber>;
    seatsPerTimeSlot: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    onlyShowFirstAvailableSlot: z.ZodOptional<z.ZodBoolean>;
    seatsShowAttendees: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>;
    seatsShowAvailabilityCount: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>;
    schedulingType: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNativeEnum<{
        ROUND_ROBIN: "ROUND_ROBIN";
        COLLECTIVE: "COLLECTIVE";
        MANAGED: "MANAGED";
    }>>>>;
    scheduleId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    price: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    slotInterval: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
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
    successRedirectUrl: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"">, z.ZodString]>>>>>;
    forwardParamsSuccessRedirect: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>;
    bookingLimits: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        PER_DAY: z.ZodOptional<z.ZodNumber>;
        PER_WEEK: z.ZodOptional<z.ZodNumber>;
        PER_MONTH: z.ZodOptional<z.ZodNumber>;
        PER_YEAR: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        PER_DAY?: number | undefined;
        PER_WEEK?: number | undefined;
        PER_MONTH?: number | undefined;
        PER_YEAR?: number | undefined;
    }, {
        PER_DAY?: number | undefined;
        PER_WEEK?: number | undefined;
        PER_MONTH?: number | undefined;
        PER_YEAR?: number | undefined;
    }>>>;
    durationLimits: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        PER_DAY: z.ZodOptional<z.ZodNumber>;
        PER_WEEK: z.ZodOptional<z.ZodNumber>;
        PER_MONTH: z.ZodOptional<z.ZodNumber>;
        PER_YEAR: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        PER_DAY?: number | undefined;
        PER_WEEK?: number | undefined;
        PER_MONTH?: number | undefined;
        PER_YEAR?: number | undefined;
    }, {
        PER_DAY?: number | undefined;
        PER_WEEK?: number | undefined;
        PER_MONTH?: number | undefined;
        PER_YEAR?: number | undefined;
    }>>>;
    isInstantEvent: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    instantMeetingExpiryTimeOffsetInSeconds: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    instantMeetingScheduleId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    assignAllTeamMembers: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    useEventTypeDestinationCalendarEmail: z.ZodOptional<z.ZodBoolean>;
    isRRWeightsEnabled: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    eventTypeColor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        lightEventTypeColor: z.ZodString;
        darkEventTypeColor: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        lightEventTypeColor: string;
        darkEventTypeColor: string;
    }, {
        lightEventTypeColor: string;
        darkEventTypeColor: string;
    }>>>;
    rescheduleWithSameRoundRobinHost: z.ZodOptional<z.ZodBoolean>;
    secondaryEmailId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    hosts: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        userId: z.ZodNumber;
        profileId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodNull]>>;
        isFixed: z.ZodOptional<z.ZodBoolean>;
        priority: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        weight: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        userId: number;
        profileId?: number | null | undefined;
        isFixed?: boolean | undefined;
        priority?: number | null | undefined;
        weight?: number | null | undefined;
    }, {
        userId: number;
        profileId?: number | null | undefined;
        isFixed?: boolean | undefined;
        priority?: number | null | undefined;
        weight?: number | null | undefined;
    }>, "many">>>;
    users: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodEffects<z.ZodString, number, string>, z.ZodNumber]>, "many">>>;
    hashedLink: z.ZodOptional<z.ZodString>;
    destinationCalendar: z.ZodOptional<z.ZodNullable<z.ZodObject<Pick<{
        id: z.ZodNumber;
        integration: z.ZodString;
        externalId: z.ZodString;
        primaryEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        userId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        eventTypeId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        credentialId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "externalId" | "integration">, "strip", z.ZodTypeAny, {
        externalId: string;
        integration: string;
    }, {
        externalId: string;
        integration: string;
    }>>>;
    customInputs: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        eventTypeId: z.ZodNumber;
        label: z.ZodString;
        type: z.ZodNativeEnum<{
            readonly TEXT: "TEXT";
            readonly TEXTLONG: "TEXTLONG";
            readonly NUMBER: "NUMBER";
            readonly BOOL: "BOOL";
            readonly RADIO: "RADIO";
            readonly PHONE: "PHONE";
        }>;
        options: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            type: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: string;
            label: string;
        }, {
            type: string;
            label: string;
        }>, "many">>>;
        required: z.ZodBoolean;
        placeholder: z.ZodString;
        hasToBeCreated: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
        id: number;
        eventTypeId: number;
        label: string;
        required: boolean;
        placeholder: string;
        options?: {
            type: string;
            label: string;
        }[] | null | undefined;
        hasToBeCreated?: boolean | undefined;
    }, {
        type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
        id: number;
        eventTypeId: number;
        label: string;
        required: boolean;
        placeholder: string;
        options?: {
            type: string;
            label: string;
        }[] | null | undefined;
        hasToBeCreated?: boolean | undefined;
    }>, "many">>>;
    children: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        owner: z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
            email: z.ZodString;
            eventTypeSlugs: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
            email: string;
            eventTypeSlugs: string[];
        }, {
            id: number;
            name: string;
            email: string;
            eventTypeSlugs: string[];
        }>;
        hidden: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        hidden: boolean;
        owner: {
            id: number;
            name: string;
            email: string;
            eventTypeSlugs: string[];
        };
    }, {
        hidden: boolean;
        owner: {
            id: number;
            name: string;
            email: string;
            eventTypeSlugs: string[];
        };
    }>, "many">>>;
    schedule: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    instantMeetingSchedule: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    aiPhoneCallConfig: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        generalPrompt: z.ZodString;
        enabled: z.ZodBoolean;
        beginMessage: z.ZodNullable<z.ZodString>;
        yourPhoneNumber: z.ZodDefault<z.ZodString>;
        numberToCall: z.ZodDefault<z.ZodString>;
        guestName: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
        guestEmail: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        guestCompany: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        templateType: z.ZodEnum<["CHECK_IN_APPOINTMENT", "CUSTOM_TEMPLATE"]>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
        generalPrompt: string;
        yourPhoneNumber: string;
        numberToCall: string;
        guestEmail: string | null;
        guestCompany: string | null;
        beginMessage: string | null;
        guestName?: string | undefined;
    }, {
        enabled: boolean;
        templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
        generalPrompt: string;
        beginMessage: string | null;
        yourPhoneNumber?: string | undefined;
        numberToCall?: string | undefined;
        guestName?: string | null | undefined;
        guestEmail?: string | null | undefined;
        guestCompany?: string | null | undefined;
    }>>>;
    calAiPhoneScript: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    id: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    id: number;
    length?: number | undefined;
    title?: string | undefined;
    slug?: string | undefined;
    description?: string | null | undefined;
    position?: number | undefined;
    locations?: {
        type: string;
        address?: string | undefined;
        link?: string | undefined;
        displayLocationPublicly?: boolean | undefined;
        hostPhoneNumber?: string | undefined;
        credentialId?: number | undefined;
        teamName?: string | undefined;
    }[] | undefined;
    offsetStart?: number | undefined;
    hidden?: boolean | undefined;
    userId?: number | null | undefined;
    profileId?: number | null | undefined;
    teamId?: number | null | undefined;
    eventName?: string | null | undefined;
    parentId?: number | null | undefined;
    bookingFields?: {
        name: string;
        type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        label?: string | undefined;
        labelAsSafeHtml?: string | undefined;
        defaultLabel?: string | undefined;
        placeholder?: string | undefined;
        defaultPlaceholder?: string | undefined;
        required?: boolean | undefined;
        getOptionsAt?: string | undefined;
        optionsInputs?: Record<string, {
            type: "text" | "phone" | "address";
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }> | undefined;
        minLength?: number | undefined;
        maxLength?: number | undefined;
        variant?: string | undefined;
        variantsConfig?: {
            variants: Record<string, {
                fields: {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }[];
            }>;
        } | undefined;
        views?: {
            label: string;
            id: string;
            description?: string | undefined;
        }[] | undefined;
        hideWhenJustOneOption?: boolean | undefined;
        hidden?: boolean | undefined;
        editable?: "user" | "system" | "system-but-optional" | "system-but-hidden" | "user-readonly" | undefined;
        sources?: {
            type: string;
            label: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }[] | undefined;
        disableOnPrefill?: boolean | undefined;
    }[] | undefined;
    timeZone?: string | null | undefined;
    periodType?: "UNLIMITED" | "ROLLING" | "ROLLING_WINDOW" | "RANGE" | undefined;
    periodStartDate?: Date | null | undefined;
    periodEndDate?: Date | null | undefined;
    periodDays?: number | null | undefined;
    periodCountCalendarDays?: boolean | null | undefined;
    lockTimeZoneToggleOnBookingPage?: boolean | undefined;
    requiresConfirmation?: boolean | undefined;
    requiresConfirmationWillBlockSlot?: boolean | undefined;
    requiresBookerEmailVerification?: boolean | undefined;
    recurringEvent?: {
        interval: number;
        count: number;
        freq: import("@calcom/prisma/zod-utils").Frequency;
        dtstart?: Date | undefined;
        until?: Date | undefined;
        tzid?: string | undefined;
    } | null | undefined;
    disableGuests?: boolean | undefined;
    hideCalendarNotes?: boolean | undefined;
    minimumBookingNotice?: number | undefined;
    beforeEventBuffer?: number | undefined;
    afterEventBuffer?: number | undefined;
    seatsPerTimeSlot?: number | null | undefined;
    onlyShowFirstAvailableSlot?: boolean | undefined;
    seatsShowAttendees?: boolean | null | undefined;
    seatsShowAvailabilityCount?: boolean | null | undefined;
    schedulingType?: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null | undefined;
    scheduleId?: number | null | undefined;
    price?: number | undefined;
    currency?: string | undefined;
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
    successRedirectUrl?: string | null | undefined;
    forwardParamsSuccessRedirect?: boolean | null | undefined;
    bookingLimits?: {
        PER_DAY?: number | undefined;
        PER_WEEK?: number | undefined;
        PER_MONTH?: number | undefined;
        PER_YEAR?: number | undefined;
    } | null | undefined;
    durationLimits?: {
        PER_DAY?: number | undefined;
        PER_WEEK?: number | undefined;
        PER_MONTH?: number | undefined;
        PER_YEAR?: number | undefined;
    } | null | undefined;
    isInstantEvent?: boolean | undefined;
    instantMeetingExpiryTimeOffsetInSeconds?: number | undefined;
    instantMeetingScheduleId?: number | null | undefined;
    assignAllTeamMembers?: boolean | undefined;
    useEventTypeDestinationCalendarEmail?: boolean | undefined;
    isRRWeightsEnabled?: boolean | undefined;
    eventTypeColor?: {
        lightEventTypeColor: string;
        darkEventTypeColor: string;
    } | null | undefined;
    rescheduleWithSameRoundRobinHost?: boolean | undefined;
    secondaryEmailId?: number | null | undefined;
    hosts?: {
        userId: number;
        profileId?: number | null | undefined;
        isFixed?: boolean | undefined;
        priority?: number | null | undefined;
        weight?: number | null | undefined;
    }[] | undefined;
    users?: number[] | undefined;
    hashedLink?: string | undefined;
    destinationCalendar?: {
        externalId: string;
        integration: string;
    } | null | undefined;
    customInputs?: {
        type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
        id: number;
        eventTypeId: number;
        label: string;
        required: boolean;
        placeholder: string;
        options?: {
            type: string;
            label: string;
        }[] | null | undefined;
        hasToBeCreated?: boolean | undefined;
    }[] | undefined;
    children?: {
        hidden: boolean;
        owner: {
            id: number;
            name: string;
            email: string;
            eventTypeSlugs: string[];
        };
    }[] | undefined;
    schedule?: number | null | undefined;
    instantMeetingSchedule?: number | null | undefined;
    aiPhoneCallConfig?: {
        enabled: boolean;
        templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
        generalPrompt: string;
        yourPhoneNumber: string;
        numberToCall: string;
        guestEmail: string | null;
        guestCompany: string | null;
        beginMessage: string | null;
        guestName?: string | undefined;
    } | undefined;
    calAiPhoneScript?: string | undefined;
}, {
    id: number;
    length?: number | undefined;
    title?: string | undefined;
    slug?: string | undefined;
    description?: string | null | undefined;
    position?: number | undefined;
    locations?: {
        type: string;
        address?: string | undefined;
        link?: string | undefined;
        displayLocationPublicly?: boolean | undefined;
        hostPhoneNumber?: string | undefined;
        credentialId?: number | undefined;
        teamName?: string | undefined;
    }[] | undefined;
    offsetStart?: number | undefined;
    hidden?: boolean | undefined;
    userId?: number | null | undefined;
    profileId?: number | null | undefined;
    teamId?: number | null | undefined;
    eventName?: string | null | undefined;
    parentId?: number | null | undefined;
    bookingFields?: {
        name: string;
        type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        label?: string | undefined;
        labelAsSafeHtml?: string | undefined;
        defaultLabel?: string | undefined;
        placeholder?: string | undefined;
        defaultPlaceholder?: string | undefined;
        required?: boolean | undefined;
        getOptionsAt?: string | undefined;
        optionsInputs?: Record<string, {
            type: "text" | "phone" | "address";
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }> | undefined;
        minLength?: number | undefined;
        maxLength?: number | undefined;
        variant?: string | undefined;
        variantsConfig?: {
            variants: Record<string, {
                fields: {
                    name: string;
                    type: "number" | "boolean" | "name" | "text" | "textarea" | "email" | "phone" | "address" | "multiemail" | "select" | "multiselect" | "checkbox" | "radio" | "radioInput" | "url";
                    label?: string | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                    maxLength?: number | undefined;
                }[];
            }>;
        } | undefined;
        views?: {
            label: string;
            id: string;
            description?: string | undefined;
        }[] | undefined;
        hideWhenJustOneOption?: boolean | undefined;
        hidden?: boolean | undefined;
        editable?: "user" | "system" | "system-but-optional" | "system-but-hidden" | "user-readonly" | undefined;
        sources?: {
            type: string;
            label: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }[] | undefined;
        disableOnPrefill?: boolean | undefined;
    }[] | undefined;
    timeZone?: string | null | undefined;
    periodType?: "UNLIMITED" | "ROLLING" | "ROLLING_WINDOW" | "RANGE" | undefined;
    periodStartDate?: Date | null | undefined;
    periodEndDate?: Date | null | undefined;
    periodDays?: number | null | undefined;
    periodCountCalendarDays?: boolean | null | undefined;
    lockTimeZoneToggleOnBookingPage?: boolean | undefined;
    requiresConfirmation?: boolean | undefined;
    requiresConfirmationWillBlockSlot?: boolean | undefined;
    requiresBookerEmailVerification?: boolean | undefined;
    recurringEvent?: {
        interval: number;
        count: number;
        freq: import("@calcom/prisma/zod-utils").Frequency;
        dtstart?: Date | undefined;
        until?: Date | undefined;
        tzid?: string | undefined;
    } | null | undefined;
    disableGuests?: boolean | undefined;
    hideCalendarNotes?: boolean | undefined;
    minimumBookingNotice?: number | undefined;
    beforeEventBuffer?: number | undefined;
    afterEventBuffer?: number | undefined;
    seatsPerTimeSlot?: number | null | undefined;
    onlyShowFirstAvailableSlot?: boolean | undefined;
    seatsShowAttendees?: boolean | null | undefined;
    seatsShowAvailabilityCount?: boolean | null | undefined;
    schedulingType?: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null | undefined;
    scheduleId?: number | null | undefined;
    price?: number | undefined;
    currency?: string | undefined;
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
    successRedirectUrl?: string | null | undefined;
    forwardParamsSuccessRedirect?: boolean | null | undefined;
    bookingLimits?: {
        PER_DAY?: number | undefined;
        PER_WEEK?: number | undefined;
        PER_MONTH?: number | undefined;
        PER_YEAR?: number | undefined;
    } | null | undefined;
    durationLimits?: {
        PER_DAY?: number | undefined;
        PER_WEEK?: number | undefined;
        PER_MONTH?: number | undefined;
        PER_YEAR?: number | undefined;
    } | null | undefined;
    isInstantEvent?: boolean | undefined;
    instantMeetingExpiryTimeOffsetInSeconds?: number | undefined;
    instantMeetingScheduleId?: number | null | undefined;
    assignAllTeamMembers?: boolean | undefined;
    useEventTypeDestinationCalendarEmail?: boolean | undefined;
    isRRWeightsEnabled?: boolean | undefined;
    eventTypeColor?: {
        lightEventTypeColor: string;
        darkEventTypeColor: string;
    } | null | undefined;
    rescheduleWithSameRoundRobinHost?: boolean | undefined;
    secondaryEmailId?: number | null | undefined;
    hosts?: {
        userId: number;
        profileId?: number | null | undefined;
        isFixed?: boolean | undefined;
        priority?: number | null | undefined;
        weight?: number | null | undefined;
    }[] | undefined;
    users?: (string | number)[] | undefined;
    hashedLink?: string | undefined;
    destinationCalendar?: {
        externalId: string;
        integration: string;
    } | null | undefined;
    customInputs?: {
        type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
        id: number;
        eventTypeId: number;
        label: string;
        required: boolean;
        placeholder: string;
        options?: {
            type: string;
            label: string;
        }[] | null | undefined;
        hasToBeCreated?: boolean | undefined;
    }[] | undefined;
    children?: {
        hidden: boolean;
        owner: {
            id: number;
            name: string;
            email: string;
            eventTypeSlugs: string[];
        };
    }[] | undefined;
    schedule?: number | null | undefined;
    instantMeetingSchedule?: number | null | undefined;
    aiPhoneCallConfig?: {
        enabled: boolean;
        templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
        generalPrompt: string;
        beginMessage: string | null;
        yourPhoneNumber?: string | undefined;
        numberToCall?: string | undefined;
        guestName?: string | null | undefined;
        guestEmail?: string | null | undefined;
        guestCompany?: string | null | undefined;
    } | undefined;
    calAiPhoneScript?: string | undefined;
}>;
export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
