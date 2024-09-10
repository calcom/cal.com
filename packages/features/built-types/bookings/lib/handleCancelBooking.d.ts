import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";
declare function getBookingToDelete(id: number | undefined, uid: string | undefined): Promise<{
    id: number;
    description: string | null;
    user: {
        name: string | null;
        email: string;
        id: number;
        username: string | null;
        timeZone: string;
        timeFormat: number | null;
        destinationCalendar: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            externalId: string;
            integration: string;
            credentialId: number | null;
            primaryEmail: string | null;
        } | null;
        credentials: {
            type: string;
            id: number;
            user: {
                email: string;
            } | null;
            userId: number | null;
            teamId: number | null;
            key: Prisma.JsonValue;
            appId: string | null;
            invalid: boolean | null;
        }[];
    } | null;
    startTime: Date;
    endTime: Date;
    metadata: Prisma.JsonValue;
    eventType: {
        length: number;
        description: string | null;
        metadata: Prisma.JsonValue;
        team: {
            name: string;
            id: number;
            parentId: number | null;
        } | null;
        userId: number | null;
        title: string;
        workflows: {
            workflow: {
                name: string;
                id: number;
                userId: number | null;
                teamId: number | null;
                time: number | null;
                steps: {
                    id: number;
                    template: import(".prisma/client").$Enums.WorkflowTemplates;
                    action: import(".prisma/client").$Enums.WorkflowActions;
                    sendTo: string | null;
                    reminderBody: string | null;
                    emailSubject: string | null;
                    numberRequired: boolean | null;
                    sender: string | null;
                    numberVerificationPending: boolean;
                    includeCalendarEvent: boolean;
                }[];
                trigger: import(".prisma/client").$Enums.WorkflowTriggerEvents;
                timeUnit: import(".prisma/client").$Enums.TimeUnit | null;
            };
        }[];
        hosts: {
            user: {
                name: string | null;
                email: string;
                id: number;
                organizationId: number | null;
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
                appTheme: string | null;
                createdDate: Date;
                trialEndsAt: Date | null;
                defaultScheduleId: number | null;
                completedOnboarding: boolean;
                timeFormat: number | null;
                twoFactorEnabled: boolean;
                backupCodes: string | null;
                identityProvider: import(".prisma/client").$Enums.IdentityProvider;
                brandColor: string | null;
                darkBrandColor: string | null;
                allowSEOIndexing: boolean | null;
                receiveMonthlyDigestEmail: boolean | null;
                metadata: Prisma.JsonValue;
                role: import(".prisma/client").$Enums.UserPermissionRole;
                disableImpersonation: boolean;
                locked: boolean;
                movedToProfileId: number | null;
                isPlatformManaged: boolean;
                smsLockState: import(".prisma/client").$Enums.SMSLockState;
                smsLockReviewedByAdmin: boolean;
            };
        }[];
        slug: string;
        parentId: number | null;
        parent: {
            teamId: number | null;
        } | null;
        eventName: string | null;
        bookingFields: Prisma.JsonValue;
        requiresConfirmation: boolean;
        recurringEvent: Prisma.JsonValue;
        seatsPerTimeSlot: number | null;
        seatsShowAttendees: boolean | null;
        schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
        price: number;
        currency: string;
        owner: {
            id: number;
            hideBranding: boolean;
        } | null;
    } | null;
    destinationCalendar: {
        id: number;
        userId: number | null;
        eventTypeId: number | null;
        externalId: string;
        integration: string;
        credentialId: number | null;
        primaryEmail: string | null;
    } | null;
    payment: {
        data: Prisma.JsonValue;
        id: number;
        uid: string;
        externalId: string;
        success: boolean;
        currency: string;
        bookingId: number;
        appId: string | null;
        amount: number;
        fee: number;
        refunded: boolean;
        paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
    }[];
    references: {
        type: string;
        uid: string;
        credentialId: number | null;
        thirdPartyRecurringEventId: string | null;
        externalCalendarId: string | null;
    }[];
    attendees: {
        name: string;
        email: string;
        id: number;
        locale: string | null;
        timeZone: string;
        bookingId: number | null;
        noShow: boolean | null;
    }[];
    workflowReminders: {
        id: number;
        bookingUid: string | null;
        cancelled: boolean | null;
        method: import(".prisma/client").$Enums.WorkflowMethods;
        scheduledDate: Date;
        referenceId: string | null;
        scheduled: boolean;
        workflowStepId: number | null;
        seatReferenceId: string | null;
        isMandatoryReminder: boolean | null;
        retryCount: number;
    }[];
    seatsReferences: {
        data: Prisma.JsonValue;
        id: number;
        bookingId: number;
        referenceUid: string;
        attendeeId: number;
    }[];
    uid: string;
    userId: number | null;
    userPrimaryEmail: string | null;
    eventTypeId: number | null;
    title: string;
    customInputs: Prisma.JsonValue;
    responses: Prisma.JsonValue;
    location: string | null;
    paid: boolean;
    recurringEventId: string | null;
    smsReminderNumber: string | null;
    iCalUID: string | null;
    iCalSequence: number;
} | null>;
export type CustomRequest = NextApiRequest & {
    userId?: number;
    bookingToDelete?: Awaited<ReturnType<typeof getBookingToDelete>>;
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
    arePlatformEmailsEnabled?: boolean;
};
export type HandleCancelBookingResponse = {
    success: boolean;
    message: string;
    onlyRemovedAttendee: boolean;
    bookingId: number;
    bookingUid: string;
};
declare function handler(req: CustomRequest): Promise<{
    success: true;
    onlyRemovedAttendee: true;
    bookingId: number;
    bookingUid: string;
    message: string;
} | {
    success: true;
    message: string;
    onlyRemovedAttendee: false;
    bookingId: number;
    bookingUid: string;
}>;
export default handler;
//# sourceMappingURL=handleCancelBooking.d.ts.map