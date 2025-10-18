import type { PrismaClient } from "@calcom/prisma";

import type {
    IOrganizationBlockListRepository,
    CreateBlockedEmailInput,
    CreateBlockedDomainInput,
    BlockedEmail,
    BlockedDomain,
    ReportedBookingSummary,
} from "./organizationBlockList.interface";

export class PrismaOrganizationBlockListRepository implements IOrganizationBlockListRepository {
    constructor(private readonly prismaClient: PrismaClient) { }

    async createBlockedEmail(input: CreateBlockedEmailInput): Promise<{ id: string }> {
        const blockedEmail = await this.prismaClient.organizationBlockedEmail.create({
            data: {
                email: input.email,
                organizationId: input.organizationId,
                createdById: input.createdById,
                reason: input.reason,
                bookingReportId: input.bookingReportId,
            },
            select: { id: true },
        });
        return blockedEmail;
    }

    async getBlockedEmails(organizationId: number, params: { skip?: number; take?: number }): Promise<BlockedEmail[]> {
        const blockedEmails = await this.prismaClient.organizationBlockedEmail.findMany({
            where: { organizationId },
            skip: params.skip,
            take: params.take,
            include: {
                createdBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                bookingReport: {
                    select: {
                        id: true,
                        reason: true,
                        description: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return blockedEmails.map((email) => ({
            id: email.id,
            email: email.email,
            organizationId: email.organizationId,
            createdAt: email.createdAt,
            createdById: email.createdById,
            reason: email.reason,
            bookingReportId: email.bookingReportId,
            createdBy: email.createdBy,
            bookingReport: email.bookingReport,
        }));
    }

    async deleteBlockedEmail(id: string, organizationId: number): Promise<void> {
        await this.prismaClient.organizationBlockedEmail.deleteMany({
            where: {
                id,
                organizationId,
            },
        });
    }

    async isEmailBlocked(email: string, organizationId: number): Promise<boolean> {
        const blockedEmail = await this.prismaClient.organizationBlockedEmail.findFirst({
            where: {
                email,
                organizationId,
            },
        });
        return !!blockedEmail;
    }

    async createBlockedDomain(input: CreateBlockedDomainInput): Promise<{ id: string }> {
        const blockedDomain = await this.prismaClient.organizationBlockedDomain.create({
            data: {
                domain: input.domain,
                organizationId: input.organizationId,
                createdById: input.createdById,
                reason: input.reason,
                bookingReportId: input.bookingReportId,
            },
            select: { id: true },
        });
        return blockedDomain;
    }

    async getBlockedDomains(organizationId: number, params: { skip?: number; take?: number }): Promise<BlockedDomain[]> {
        const blockedDomains = await this.prismaClient.organizationBlockedDomain.findMany({
            where: { organizationId },
            skip: params.skip,
            take: params.take,
            include: {
                createdBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                bookingReport: {
                    select: {
                        id: true,
                        reason: true,
                        description: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return blockedDomains.map((domain) => ({
            id: domain.id,
            domain: domain.domain,
            organizationId: domain.organizationId,
            createdAt: domain.createdAt,
            createdById: domain.createdById,
            reason: domain.reason,
            bookingReportId: domain.bookingReportId,
            createdBy: domain.createdBy,
            bookingReport: domain.bookingReport,
        }));
    }

    async deleteBlockedDomain(id: string, organizationId: number): Promise<void> {
        await this.prismaClient.organizationBlockedDomain.deleteMany({
            where: {
                id,
                organizationId,
            },
        });
    }

    async isDomainBlocked(domain: string, organizationId: number): Promise<boolean> {
        const blockedDomain = await this.prismaClient.organizationBlockedDomain.findFirst({
            where: {
                domain,
                organizationId,
            },
        });
        return !!blockedDomain;
    }

    async getReportedBookings(organizationId: number, params: { skip?: number; take?: number }): Promise<ReportedBookingSummary[]> {
        const reportedBookings = await this.prismaClient.bookingReport.findMany({
            where: { organizationId },
            skip: params.skip,
            take: params.take,
            include: {
                reportedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                booking: {
                    select: {
                        title: true,
                        startTime: true,
                        endTime: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return reportedBookings.map((report) => ({
            id: report.id,
            bookingUid: report.bookingUid,
            bookerEmail: report.bookerEmail,
            reason: report.reason,
            description: report.description,
            createdAt: report.createdAt,
            cancelled: report.cancelled,
            reportedBy: report.reportedBy,
            booking: report.booking,
        }));
    }

    async ignoreReport(bookingReportId: string, organizationId: number): Promise<void> {
        // For now, we'll just mark the report as ignored by adding a flag
        // In the future, we might want to add an "ignored" status or similar
        await this.prismaClient.bookingReport.updateMany({
            where: {
                id: bookingReportId,
                organizationId,
            },
            data: {
                // We could add an ignored field here if needed
                // For now, we'll just leave it as is since the requirement is to not delete the report
            },
        });
    }
}
