import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetInputSchema;
};
export declare const getHandler: ({ ctx, input }: GetOptions) => Promise<{
    members: {
        username: string | null;
        role: import(".prisma/client").$Enums.MembershipRole;
        profile: import("@calcom/types/UserProfile").UserProfile;
        organizationId: number | null;
        organization: any;
        accepted: boolean;
        disableImpersonation: boolean;
        subteams: (string | null)[] | null;
        bookerUrl: string;
        connectedApps: {
            name: any;
            logo: any;
            app: {
                slug: string;
                categories: import(".prisma/client").$Enums.AppCategories[];
            } | null;
            externalId: string | null;
        }[] | null;
        id: number;
        name: string | null;
        email: string;
        bio: string | null;
        avatarUrl: string | null;
        teams: {
            team: {
                id: number;
                slug: string | null;
            };
        }[];
        nonProfileUsername: string | null;
    }[];
    safeBio: string;
    membership: {
        role: import(".prisma/client").$Enums.MembershipRole;
        accepted: boolean;
    };
    inviteToken: {
        token: string;
        expires: Date;
        expiresInDays: number | null;
        identifier: string;
    } | undefined;
    metadata: {
        requestedSlug?: string | null | undefined;
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
    eventTypes: {
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
        } | null;
        users: ({
            id: number;
            name: string | null;
            email: string;
            username: string | null;
            bio: string | null;
            avatarUrl: string | null;
            credentials: {
                app: {
                    slug: string;
                    categories: import(".prisma/client").$Enums.AppCategories[];
                } | null;
                destinationCalendars: {
                    externalId: string;
                }[];
            }[];
            teams: {
                team: {
                    id: number;
                    slug: string | null;
                };
            }[];
        } & {
            nonProfileUsername: string | null;
            profile: import("@calcom/types/UserProfile").UserProfile;
        })[];
        length: number;
        id: number;
        title: string;
        slug: string;
        description: string | null;
        hidden: boolean;
        lockTimeZoneToggleOnBookingPage: boolean;
        requiresConfirmation: boolean;
        requiresBookerEmailVerification: boolean;
        recurringEvent: import(".prisma/client").Prisma.JsonValue;
        schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
        price: number;
        currency: string;
        hosts: {
            user: {
                id: number;
                name: string | null;
                email: string;
                username: string | null;
                bio: string | null;
                avatarUrl: string | null;
                credentials: {
                    app: {
                        slug: string;
                        categories: import(".prisma/client").$Enums.AppCategories[];
                    } | null;
                    destinationCalendars: {
                        externalId: string;
                    }[];
                }[];
                teams: {
                    team: {
                        id: number;
                        slug: string | null;
                    };
                }[];
            };
        }[];
    }[] | null;
    logo?: string | undefined;
    id: number;
    slug: string | null;
    parentId: number | null;
    parent: {
        id: number;
        slug: string | null;
        metadata: import(".prisma/client").Prisma.JsonValue;
        name: string;
        logoUrl: string | null;
        isPrivate: boolean;
        isOrganization: boolean;
    } | null;
    children: {
        slug: string | null;
        name: string;
    }[];
    name: string;
    bio: string | null;
    hideBranding: boolean;
    theme: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    logoUrl: string | null;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    isOrganization: boolean;
}>;
export default getHandler;
