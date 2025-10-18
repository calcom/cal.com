export interface BlockedEmail {
    id: string;
    email: string;
    organizationId: number;
    createdAt: Date;
    createdById: number;
    reason?: string;
    bookingReportId?: string;
    createdBy: {
        name: string | null;
        email: string;
    };
    bookingReport?: {
        id: string;
        reason: string;
        description?: string;
        createdAt: Date;
    };
}

export interface BlockedDomain {
    id: string;
    domain: string;
    organizationId: number;
    createdAt: Date;
    createdById: number;
    reason?: string;
    bookingReportId?: string;
    createdBy: {
        name: string | null;
        email: string;
    };
    bookingReport?: {
        id: string;
        reason: string;
        description?: string;
        createdAt: Date;
    };
}

export interface ReportedBookingSummary {
    id: string;
    bookingUid: string;
    bookerEmail: string;
    reason: string;
    description?: string;
    createdAt: Date;
    cancelled: boolean;
    reportedBy: {
        name: string | null;
        email: string;
    };
    booking: {
        title: string;
        startTime: Date;
        endTime: Date;
        status: string;
    };
}

export interface CreateBlockedEmailInput {
    email: string;
    organizationId: number;
    createdById: number;
    reason?: string;
    bookingReportId?: string;
}

export interface CreateBlockedDomainInput {
    domain: string;
    organizationId: number;
    createdById: number;
    reason?: string;
    bookingReportId?: string;
}

export interface IOrganizationBlockListRepository {
    // Blocked Emails
    createBlockedEmail(input: CreateBlockedEmailInput): Promise<{ id: string }>;
    getBlockedEmails(organizationId: number, params: { skip?: number; take?: number }): Promise<BlockedEmail[]>;
    deleteBlockedEmail(id: string, organizationId: number): Promise<void>;
    isEmailBlocked(email: string, organizationId: number): Promise<boolean>;

    // Blocked Domains
    createBlockedDomain(input: CreateBlockedDomainInput): Promise<{ id: string }>;
    getBlockedDomains(organizationId: number, params: { skip?: number; take?: number }): Promise<BlockedDomain[]>;
    deleteBlockedDomain(id: string, organizationId: number): Promise<void>;
    isDomainBlocked(domain: string, organizationId: number): Promise<boolean>;

    // Reported Bookings
    getReportedBookings(organizationId: number, params: { skip?: number; take?: number }): Promise<ReportedBookingSummary[]>;
    ignoreReport(bookingReportId: string, organizationId: number): Promise<void>;
}
