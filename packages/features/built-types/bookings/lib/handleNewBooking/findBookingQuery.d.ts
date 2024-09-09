export declare const findBookingQuery: (bookingId: number) => Promise<{
    title: string;
    metadata: import(".prisma/client").Prisma.JsonValue;
    eventType: {
        title: string;
        length: number;
        description: string | null;
        lockTimeZoneToggleOnBookingPage: boolean;
        requiresConfirmation: boolean;
        requiresBookerEmailVerification: boolean;
        price: number;
        currency: string;
    } | null;
    location: string | null;
    status: import(".prisma/client").$Enums.BookingStatus;
    description: string | null;
    user: {
        name: string | null;
        email: string;
        timeZone: string;
        username: string | null;
    } | null;
    uid: string;
    responses: import(".prisma/client").Prisma.JsonValue;
    startTime: Date;
    endTime: Date;
}>;
//# sourceMappingURL=findBookingQuery.d.ts.map