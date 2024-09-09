import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";
declare function getBookingToDelete(id: number | undefined, uid: string | undefined): Promise<{
    title: string;
    metadata: Prisma.JsonValue;
    id: number;
    eventType: {
        title: string;
        metadata: Prisma.JsonValue;
        length: number;
        parent: {
            teamId: number | null;
        } | null;
        description: string | null;
        slug: string;
        userId: number | null;
        eventName: string | null;
        parentId: number | null;
        bookingFields: Prisma.JsonValue;
        requiresConfirmation: boolean;
        recurringEvent: Prisma.JsonValue;
        seatsPerTimeSlot: number | null;
        seatsShowAttendees: boolean | null;
        schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
        price: number;
        currency: string;
        hosts: {
            user: {
                metadata: Prisma.JsonValue;
                theme: string | null;
                id: number;
                name: string | null;
                email: string;
                organizationId: number | null;
                timeZone: string;
                username: string | null;
                locale: string | null;
                startTime: number;
                endTime: number;
                bio: string | null;
                hideBranding: boolean;
                brandColor: string | null;
                darkBrandColor: string | null;
                timeFormat: number | null;
                weekStart: string;
                smsLockState: import(".prisma/client").$Enums.SMSLockState;
                smsLockReviewedByAdmin: boolean;
                emailVerified: Date | null;
                avatarUrl: string | null;
                bufferTime: number;
                appTheme: string | null;
                createdDate: Date;
                trialEndsAt: Date | null;
                defaultScheduleId: number | null;
                completedOnboarding: boolean;
                twoFactorSecret: string | null;
                twoFactorEnabled: boolean;
                backupCodes: string | null;
                identityProvider: import(".prisma/client").$Enums.IdentityProvider;
                identityProviderId: string | null;
                invitedTo: number | null;
                allowDynamicBooking: boolean | null;
                allowSEOIndexing: boolean | null;
                receiveMonthlyDigestEmail: boolean | null;
                verified: boolean | null;
                role: import(".prisma/client").$Enums.UserPermissionRole;
                disableImpersonation: boolean;
                locked: boolean;
                movedToProfileId: number | null;
                isPlatformManaged: boolean;
            };
        }[];
        owner: {
            id: number;
            hideBranding: boolean;
        } | null;
        team: {
            id: number;
            name: string;
            parentId: number | null;
        } | null;
        workflows: {
            workflow: {
                time: number | null;
                id: number;
                name: string;
                userId: number | null;
                teamId: number | null;
                steps: {
                    template: import(".prisma/client").$Enums.WorkflowTemplates;
                    id: number;
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
    } | null;
    location: string | null;
    description: string | null;
    user: {
        id: number;
        name: string | null;
        email: string;
        timeZone: string;
        destinationCalendar: {
            id: number;
            userId: number | null;
            credentialId: number | null;
            eventTypeId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        username: string | null;
        timeFormat: number | null;
        credentials: {
            invalid: boolean | null;
            type: string;
            id: number;
            key: Prisma.JsonValue;
            user: {
                email: string;
            } | null;
            userId: number | null;
            teamId: number | null;
            appId: string | null;
        }[];
    } | null;
    userId: number | null;
    destinationCalendar: {
        id: number;
        userId: number | null;
        credentialId: number | null;
        eventTypeId: number | null;
        integration: string;
        externalId: string;
        primaryEmail: string | null;
    } | null;
    customInputs: Prisma.JsonValue;
    smsReminderNumber: string | null;
    eventTypeId: number | null;
    recurringEventId: string | null;
    uid: string;
    iCalUID: string | null;
    responses: Prisma.JsonValue;
    payment: {
        data: Prisma.JsonValue;
        id: number;
        currency: string;
        bookingId: number;
        success: boolean;
        uid: string;
        appId: string | null;
        externalId: string;
        amount: number;
        fee: number;
        refunded: boolean;
        paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
    }[];
    references: {
        type: string;
        credentialId: number | null;
        uid: string;
        thirdPartyRecurringEventId: string | null;
        externalCalendarId: string | null;
    }[];
    attendees: {
        id: number;
        name: string;
        email: string;
        timeZone: string;
        bookingId: number | null;
        locale: string | null;
        noShow: boolean | null;
    }[];
    workflowReminders: {
        method: import(".prisma/client").$Enums.WorkflowMethods;
        id: number;
        bookingUid: string | null;
        referenceId: string | null;
        scheduledDate: Date;
        scheduled: boolean;
        workflowStepId: number | null;
        cancelled: boolean | null;
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
    userPrimaryEmail: string | null;
    startTime: Date;
    endTime: Date;
    paid: boolean;
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