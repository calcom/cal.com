declare const getBookingInfo: (uid: string) => Promise<{
    bookingInfoRaw: undefined;
    bookingInfo: undefined;
} | {
    bookingInfoRaw: {
        title: string;
        metadata: import(".prisma/client").Prisma.JsonValue;
        id: number;
        eventType: {
            timeZone: string | null;
            slug: string;
            eventName: string | null;
            schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
        } | null;
        location: string | null;
        status: import(".prisma/client").$Enums.BookingStatus;
        description: string | null;
        user: {
            id: number;
            name: string | null;
            email: string;
            timeZone: string;
            username: string | null;
            avatarUrl: string | null;
        } | null;
        customInputs: import(".prisma/client").Prisma.JsonValue;
        smsReminderNumber: string | null;
        eventTypeId: number | null;
        recurringEventId: string | null;
        uid: string;
        cancellationReason: string | null;
        responses: import(".prisma/client").Prisma.JsonValue;
        attendees: {
            name: string;
            email: string;
            timeZone: string;
        }[];
        seatsReferences: {
            referenceUid: string;
        }[];
        userPrimaryEmail: string | null;
        startTime: Date;
        endTime: Date;
        rejectionReason: string | null;
        rescheduled: boolean | null;
        fromReschedule: string | null;
    };
    bookingInfo: Omit<{
        title: string;
        metadata: import(".prisma/client").Prisma.JsonValue;
        id: number;
        eventType: {
            timeZone: string | null;
            slug: string;
            eventName: string | null;
            schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
        } | null;
        location: string | null;
        status: import(".prisma/client").$Enums.BookingStatus;
        description: string | null;
        user: {
            id: number;
            name: string | null;
            email: string;
            timeZone: string;
            username: string | null;
            avatarUrl: string | null;
        } | null;
        customInputs: import(".prisma/client").Prisma.JsonValue;
        smsReminderNumber: string | null;
        eventTypeId: number | null;
        recurringEventId: string | null;
        uid: string;
        cancellationReason: string | null;
        responses: import(".prisma/client").Prisma.JsonValue;
        attendees: {
            name: string;
            email: string;
            timeZone: string;
        }[];
        seatsReferences: {
            referenceUid: string;
        }[];
        userPrimaryEmail: string | null;
        startTime: Date;
        endTime: Date;
        rejectionReason: string | null;
        rescheduled: boolean | null;
        fromReschedule: string | null;
    }, "responses"> & {
        responses: Record<string, string | boolean | string[] | Record<string, string> | {
            value: string;
            optionValue: string;
        }>;
    };
}>;
export default getBookingInfo;
//# sourceMappingURL=getBookingInfo.d.ts.map