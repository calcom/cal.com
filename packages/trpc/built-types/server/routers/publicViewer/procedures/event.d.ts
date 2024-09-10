export declare const event: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
    input: {
        username: string;
        eventSlug: string;
        org: string | null;
        isTeamEvent?: boolean | undefined;
        fromRedirectOfNonOrgLink?: boolean | undefined;
    };
    output: {
        bookingFields: {
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
        }[] & import("zod").BRAND<"HAS_SYSTEM_FIELDS">;
        users: ({
            metadata: undefined;
            bookerUrl: string;
            profile: import("@calcom/types/UserProfile").UserAsPersonalProfile;
            name: string | null;
            email: string;
            id: number;
            locale: string | null;
            twoFactorSecret: string | null;
            emailVerified: Date | null;
            identityProviderId: string | null;
            invitedTo: number | null;
            allowDynamicBooking: boolean | null;
            verified: boolean | null;
            username: string | null;
            bio: string | null;
            avatarUrl: string | null;
            timeZone: string;
            weekStart: string;
            startTime: number;
            endTime: number;
            bufferTime: number;
            hideBranding: boolean;
            theme: string | null;
            createdDate: Date;
            trialEndsAt: Date | null;
            completedOnboarding: boolean;
            timeFormat: number | null;
            twoFactorEnabled: boolean;
            backupCodes: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            allowSEOIndexing: boolean | null;
            receiveMonthlyDigestEmail: boolean | null;
            disableImpersonation: boolean;
            locked: boolean;
            movedToProfileId: number | null;
            isPlatformManaged: boolean;
        } | {
            metadata: undefined;
            bookerUrl: string;
            profile: {
                organization: Omit<{
                    name: string;
                    id: number;
                    metadata: import(".prisma/client").Prisma.JsonValue;
                    slug: string | null;
                    logoUrl: string | null;
                    calVideoLogo: string | null;
                    bannerUrl: string | null;
                    isPlatform: boolean;
                } & Omit<Pick<{
                    id: number;
                    name: string;
                    slug: string | null;
                    logoUrl: string | null;
                    calVideoLogo: string | null;
                    appLogo: string | null;
                    appIconLogo: string | null;
                    bio: string | null;
                    hideBranding: boolean;
                    isPrivate: boolean;
                    hideBookATeamMember: boolean;
                    createdAt: Date;
                    metadata: import(".prisma/client").Prisma.JsonValue;
                    theme: string | null;
                    brandColor: string | null;
                    darkBrandColor: string | null;
                    bannerUrl: string | null;
                    parentId: number | null;
                    timeFormat: number | null;
                    timeZone: string;
                    weekStart: string;
                    isOrganization: boolean;
                    pendingPayment: boolean;
                    isPlatform: boolean;
                    createdByOAuthClientId: string | null;
                    smsLockState: import(".prisma/client").$Enums.SMSLockState;
                    smsLockReviewedByAdmin: boolean;
                }, "id" | "slug" | "metadata" | "name" | "logoUrl" | "calVideoLogo" | "bannerUrl" | "isPlatform">, "metadata"> & {
                    requestedSlug: string | null;
                    metadata: {
                        requestedSlug: string | null;
                        paymentId?: string | undefined;
                        subscriptionId?: string | null | undefined;
                        subscriptionItemId?: string | null | undefined;
                        orgSeats?: number | null | undefined;
                        orgPricePerSeat?: number | null | undefined;
                        migratedToOrgFrom?: {
                            teamSlug?: string | null | undefined;
                            lastMigrationTime?: string | undefined;
                            reverted?: boolean | undefined;
                            lastRevertTime?: string | undefined;
                        } | undefined;
                        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
                    };
                }, "metadata"> & {
                    requestedSlug: string | null;
                    metadata: {
                        requestedSlug: string | null;
                        paymentId?: string | undefined;
                        subscriptionId?: string | null | undefined;
                        subscriptionItemId?: string | null | undefined;
                        orgSeats?: number | null | undefined;
                        orgPricePerSeat?: number | null | undefined;
                        migratedToOrgFrom?: {
                            teamSlug?: string | null | undefined;
                            lastMigrationTime?: string | undefined;
                            reverted?: boolean | undefined;
                            lastRevertTime?: string | undefined;
                        } | undefined;
                        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
                    };
                };
                id: number;
                organizationId: number;
                username: string;
                uid: string;
                userId: number;
                createdAt: Date & string;
                updatedAt: Date & string;
                upId: string;
            };
            name: string | null;
            email: string;
            id: number;
            locale: string | null;
            twoFactorSecret: string | null;
            emailVerified: Date | null;
            identityProviderId: string | null;
            invitedTo: number | null;
            allowDynamicBooking: boolean | null;
            verified: boolean | null;
            username: string | null;
            bio: string | null;
            avatarUrl: string | null;
            timeZone: string;
            weekStart: string;
            startTime: number;
            endTime: number;
            bufferTime: number;
            hideBranding: boolean;
            theme: string | null;
            createdDate: Date;
            trialEndsAt: Date | null;
            completedOnboarding: boolean;
            timeFormat: number | null;
            twoFactorEnabled: boolean;
            backupCodes: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            allowSEOIndexing: boolean | null;
            receiveMonthlyDigestEmail: boolean | null;
            disableImpersonation: boolean;
            locked: boolean;
            movedToProfileId: number | null;
            isPlatformManaged: boolean;
        })[];
        locations: (Pick<Partial<import("@calcom/app-store/locations").LocationObject>, "address" | "link"> & Omit<import("@calcom/app-store/locations").LocationObject, "address" | "link">)[];
        profile: {
            image?: string | undefined;
            name?: string | undefined;
            username?: string | null | undefined;
            weekStart: string;
            brandColor: string | null;
            darkBrandColor: string | null;
            theme: null;
            bookerLayouts: {
                enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
            } | null;
        };
        entity: {
            considerUnpublished: boolean;
            fromRedirectOfNonOrgLink: boolean;
            orgSlug: string | null;
            name: string | null;
            teamSlug: null;
            logoUrl: null;
        };
        isInstantEvent: boolean;
        showInstantEventConnectNowModal: boolean;
        metadata: {
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
                    description?: true | undefined;
                    hidden?: true | undefined;
                    children?: true | undefined;
                    timeZone?: true | undefined;
                    metadata?: true | undefined;
                    destinationCalendar?: true | undefined;
                    profile?: true | undefined;
                    team?: true | undefined;
                    schedule?: true | undefined;
                    availability?: true | undefined;
                    hashedLink?: true | undefined;
                    secondaryEmail?: true | undefined;
                    userId?: true | undefined;
                    title?: true | undefined;
                    customInputs?: true | undefined;
                    bookings?: true | undefined;
                    webhooks?: true | undefined;
                    workflows?: true | undefined;
                    hosts?: true | undefined;
                    slug?: true | undefined;
                    parentId?: true | undefined;
                    parent?: true | undefined;
                    _count?: true | undefined;
                    teamId?: true | undefined;
                    profileId?: true | undefined;
                    scheduleId?: true | undefined;
                    users?: true | undefined;
                    position?: true | undefined;
                    locations?: true | undefined;
                    offsetStart?: true | undefined;
                    eventName?: true | undefined;
                    bookingFields?: true | undefined;
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
                    price?: true | undefined;
                    currency?: true | undefined;
                    slotInterval?: true | undefined;
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
                    owner?: true | undefined;
                    instantMeetingSchedule?: true | undefined;
                    aiPhoneCallConfig?: true | undefined;
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
        } | null;
        isDynamic: boolean;
        periodCountCalendarDays: boolean;
        periodStartDate: null;
        periodEndDate: null;
        beforeEventBuffer: number;
        afterEventBuffer: number;
        periodType: "UNLIMITED";
        periodDays: null;
        slotInterval: null;
        offsetStart: number;
        customInputs: {
            type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
            label: string;
            placeholder: string;
            required: boolean;
            id: number;
            eventTypeId: number;
            options?: {
                type: string;
                label: string;
            }[] | null | undefined;
            hasToBeCreated?: boolean | undefined;
        }[];
        disableGuests: boolean;
        minimumBookingNotice: number;
        schedule: null;
        timeZone: null;
        successRedirectUrl: string;
        forwardParamsSuccessRedirect: boolean;
        teamId: null;
        scheduleId: null;
        availability: never[];
        price: number;
        currency: string;
        schedulingType: "COLLECTIVE";
        seatsPerTimeSlot: null;
        seatsShowAttendees: null;
        seatsShowAvailabilityCount: null;
        onlyShowFirstAvailableSlot: boolean;
        id: number;
        hideCalendarNotes: boolean;
        recurringEvent: null;
        destinationCalendar: null;
        team: null;
        lockTimeZoneToggleOnBookingPage: boolean;
        requiresConfirmation: boolean;
        requiresBookerEmailVerification: boolean;
        bookingLimits: null;
        durationLimits: null;
        hidden: boolean;
        userId: number;
        parentId: null;
        parent: null;
        owner: null;
        workflows: never[];
        hosts: never[];
        assignAllTeamMembers: boolean;
        isRRWeightsEnabled: boolean;
        rescheduleWithSameRoundRobinHost: boolean;
        useEventTypeDestinationCalendarEmail: boolean;
        secondaryEmailId: null;
        secondaryEmail: null;
        length: number;
        slug: string;
        title: string;
        eventName: string;
        description: string;
        descriptionAsSafeHTML: string;
        position: number;
    } | {
        bookerLayouts: {
            enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
            defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
        } | null;
        description: string;
        metadata: {
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
                    description?: true | undefined;
                    hidden?: true | undefined;
                    children?: true | undefined;
                    timeZone?: true | undefined;
                    metadata?: true | undefined;
                    destinationCalendar?: true | undefined;
                    profile?: true | undefined;
                    team?: true | undefined;
                    schedule?: true | undefined;
                    availability?: true | undefined;
                    hashedLink?: true | undefined;
                    secondaryEmail?: true | undefined;
                    userId?: true | undefined;
                    title?: true | undefined;
                    customInputs?: true | undefined;
                    bookings?: true | undefined;
                    webhooks?: true | undefined;
                    workflows?: true | undefined;
                    hosts?: true | undefined;
                    slug?: true | undefined;
                    parentId?: true | undefined;
                    parent?: true | undefined;
                    _count?: true | undefined;
                    teamId?: true | undefined;
                    profileId?: true | undefined;
                    scheduleId?: true | undefined;
                    users?: true | undefined;
                    position?: true | undefined;
                    locations?: true | undefined;
                    offsetStart?: true | undefined;
                    eventName?: true | undefined;
                    bookingFields?: true | undefined;
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
                    price?: true | undefined;
                    currency?: true | undefined;
                    slotInterval?: true | undefined;
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
                    owner?: true | undefined;
                    instantMeetingSchedule?: true | undefined;
                    aiPhoneCallConfig?: true | undefined;
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
        } | null;
        customInputs: {
            type: "TEXT" | "TEXTLONG" | "NUMBER" | "BOOL" | "RADIO" | "PHONE";
            label: string;
            placeholder: string;
            required: boolean;
            id: number;
            eventTypeId: number;
            options?: {
                type: string;
                label: string;
            }[] | null | undefined;
            hasToBeCreated?: boolean | undefined;
        }[];
        locations: (Pick<Partial<import("@calcom/app-store/locations").LocationObject>, "address" | "link"> & Omit<import("@calcom/app-store/locations").LocationObject, "address" | "link">)[];
        bookingFields: {
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
        }[] & import("zod").BRAND<"HAS_SYSTEM_FIELDS">;
        recurringEvent: import("@calcom/types/Calendar").RecurringEvent | null;
        profile: {
            username: string | null | undefined;
            name: string | null;
            weekStart: string;
            image: string;
            brandColor: string | null;
            darkBrandColor: string | null;
            theme: string | null;
            bookerLayouts: {
                enabledLayouts: import("@calcom/prisma/zod-utils").BookerLayouts[];
                defaultLayout: import("@calcom/prisma/zod-utils").BookerLayouts;
            } | null;
        };
        users: {
            username: string | null;
            name: string | null;
            weekStart: string;
            organizationId: any;
            avatarUrl: string | null;
            profile: import("@calcom/types/UserProfile").UserProfile;
            bookerUrl: string;
        }[];
        entity: {
            logoUrl?: string | undefined;
            name: any;
            fromRedirectOfNonOrgLink: boolean;
            considerUnpublished: boolean;
            orgSlug: string | null;
            teamSlug: string | null;
        };
        isDynamic: boolean;
        isInstantEvent: boolean;
        showInstantEventConnectNowModal: boolean;
        aiPhoneCallConfig: {
            id: number;
            eventTypeId: number;
            enabled: boolean;
            templateType: string;
            schedulerName: string | null;
            generalPrompt: string | null;
            yourPhoneNumber: string;
            numberToCall: string;
            guestName: string | null;
            guestEmail: string | null;
            guestCompany: string | null;
            beginMessage: string | null;
            llmId: string | null;
        } | null;
        assignAllTeamMembers: boolean;
        owner: ({
            name: string | null;
            id: number;
            username: string | null;
            avatarUrl: string | null;
            weekStart: string;
            theme: string | null;
            defaultScheduleId: number | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            metadata: import(".prisma/client").Prisma.JsonValue;
            organization: {
                name: string;
                id: number;
                slug: string | null;
                calVideoLogo: string | null;
                bannerUrl: string | null;
            } | null;
        } & {
            nonProfileUsername: string | null;
            profile: import("@calcom/types/UserProfile").UserProfile;
        }) | null;
        hosts: {
            user: {
                name: string | null;
                id: number;
                username: string | null;
                avatarUrl: string | null;
                weekStart: string;
                theme: string | null;
                defaultScheduleId: number | null;
                brandColor: string | null;
                darkBrandColor: string | null;
                metadata: import(".prisma/client").Prisma.JsonValue;
                organization: {
                    name: string;
                    id: number;
                    slug: string | null;
                    calVideoLogo: string | null;
                    bannerUrl: string | null;
                } | null;
            } & {
                nonProfileUsername: string | null;
                profile: import("@calcom/types/UserProfile").UserProfile;
            };
        }[];
        length: number;
        id: number;
        hidden: boolean;
        team: {
            name: string;
            theme: string | null;
            brandColor: string | null;
            darkBrandColor: string | null;
            metadata: import(".prisma/client").Prisma.JsonValue;
            slug: string | null;
            logoUrl: string | null;
            parentId: number | null;
            parent: {
                name: string;
                slug: string | null;
                logoUrl: string | null;
                bannerUrl: string | null;
            } | null;
        } | null;
        schedule: {
            id: number;
            timeZone: string | null;
        } | null;
        title: string;
        workflows: ({
            workflow: {
                steps: {
                    id: number;
                    template: import(".prisma/client").$Enums.WorkflowTemplates;
                    workflowId: number;
                    stepNumber: number;
                    action: import(".prisma/client").$Enums.WorkflowActions;
                    sendTo: string | null;
                    reminderBody: string | null;
                    emailSubject: string | null;
                    numberRequired: boolean | null;
                    sender: string | null;
                    numberVerificationPending: boolean;
                    includeCalendarEvent: boolean;
                }[];
            } & {
                name: string;
                id: number;
                userId: number | null;
                teamId: number | null;
                time: number | null;
                position: number;
                isActiveOnAll: boolean;
                trigger: import(".prisma/client").$Enums.WorkflowTriggerEvents;
                timeUnit: import(".prisma/client").$Enums.TimeUnit | null;
            };
        } & {
            id: number;
            eventTypeId: number;
            workflowId: number;
        })[];
        slug: string;
        eventName: string | null;
        lockTimeZoneToggleOnBookingPage: boolean;
        requiresConfirmation: boolean;
        requiresBookerEmailVerification: boolean;
        disableGuests: boolean;
        seatsPerTimeSlot: number | null;
        seatsShowAvailabilityCount: boolean | null;
        schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
        price: number;
        currency: string;
        successRedirectUrl: string | null;
        forwardParamsSuccessRedirect: boolean | null;
        rescheduleWithSameRoundRobinHost: boolean;
        instantMeetingSchedule: {
            id: number;
            timeZone: string | null;
        } | null;
    } | null;
}>;
