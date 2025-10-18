import { TRPCError } from "@trpc/server";

import { PrismaOrganizationBlockListRepository } from "@calcom/lib/server/repository/organizationBlockList";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type {
    TGetBlockedEmailsInputSchema,
    TGetBlockedDomainsInputSchema,
    TGetReportedBookingsInputSchema,
    TCreateBlockedEmailInputSchema,
    TCreateBlockedDomainInputSchema,
    TDeleteBlockedEmailInputSchema,
    TDeleteBlockedDomainInputSchema,
    TIgnoreReportInputSchema,
    TBlockEmailFromReportInputSchema,
    TBlockDomainFromReportInputSchema,
} from "./blockList.schema";

type BlockListHandlerOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};

export const getBlockedEmailsHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TGetBlockedEmailsInputSchema }) => {
    const { user } = ctx;
    const { organizationId, skip, take } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to access this organization's block list",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);
    return repository.getBlockedEmails(organizationId, { skip, take });
};

export const getBlockedDomainsHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TGetBlockedDomainsInputSchema }) => {
    const { user } = ctx;
    const { organizationId, skip, take } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to access this organization's block list",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);
    return repository.getBlockedDomains(organizationId, { skip, take });
};

export const getReportedBookingsHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TGetReportedBookingsInputSchema }) => {
    const { user } = ctx;
    const { organizationId, skip, take } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to access this organization's block list",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);
    return repository.getReportedBookings(organizationId, { skip, take });
};

export const createBlockedEmailHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TCreateBlockedEmailInputSchema }) => {
    const { user } = ctx;
    const { email, organizationId, reason, bookingReportId } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage this organization's block list",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);

    // Check if email is already blocked
    const isAlreadyBlocked = await repository.isEmailBlocked(email, organizationId);
    if (isAlreadyBlocked) {
        throw new TRPCError({
            code: "CONFLICT",
            message: "This email is already blocked",
        });
    }

    return repository.createBlockedEmail({
        email,
        organizationId,
        createdById: user.id,
        reason,
        bookingReportId,
    });
};

export const createBlockedDomainHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TCreateBlockedDomainInputSchema }) => {
    const { user } = ctx;
    const { domain, organizationId, reason, bookingReportId } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage this organization's block list",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);

    // Check if domain is already blocked
    const isAlreadyBlocked = await repository.isDomainBlocked(domain, organizationId);
    if (isAlreadyBlocked) {
        throw new TRPCError({
            code: "CONFLICT",
            message: "This domain is already blocked",
        });
    }

    return repository.createBlockedDomain({
        domain,
        organizationId,
        createdById: user.id,
        reason,
        bookingReportId,
    });
};

export const deleteBlockedEmailHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TDeleteBlockedEmailInputSchema }) => {
    const { user } = ctx;
    const { id, organizationId } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage this organization's block list",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);
    await repository.deleteBlockedEmail(id, organizationId);
    return { success: true };
};

export const deleteBlockedDomainHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TDeleteBlockedDomainInputSchema }) => {
    const { user } = ctx;
    const { id, organizationId } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage this organization's block list",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);
    await repository.deleteBlockedDomain(id, organizationId);
    return { success: true };
};

export const ignoreReportHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TIgnoreReportInputSchema }) => {
    const { user } = ctx;
    const { bookingReportId, organizationId } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage this organization's block list",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);
    await repository.ignoreReport(bookingReportId, organizationId);
    return { success: true };
};

export const blockEmailFromReportHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TBlockEmailFromReportInputSchema }) => {
    const { user } = ctx;
    const { bookingReportId, organizationId } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage this organization's block list",
        });
    }

    // Get the booking report to extract the email
    const bookingReport = await prisma.bookingReport.findFirst({
        where: {
            id: bookingReportId,
            organizationId,
        },
        select: {
            bookerEmail: true,
            reason: true,
        },
    });

    if (!bookingReport) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking report not found",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);

    // Check if email is already blocked
    const isAlreadyBlocked = await repository.isEmailBlocked(bookingReport.bookerEmail, organizationId);
    if (isAlreadyBlocked) {
        throw new TRPCError({
            code: "CONFLICT",
            message: "This email is already blocked",
        });
    }

    return repository.createBlockedEmail({
        email: bookingReport.bookerEmail,
        organizationId,
        createdById: user.id,
        reason: `Blocked from report: ${bookingReport.reason}`,
        bookingReportId,
    });
};

export const blockDomainFromReportHandler = async ({
    ctx,
    input,
}: BlockListHandlerOptions & { input: TBlockDomainFromReportInputSchema }) => {
    const { user } = ctx;
    const { bookingReportId, organizationId } = input;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
        where: {
            userId: user.id,
            teamId: organizationId,
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
        },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to manage this organization's block list",
        });
    }

    // Get the booking report to extract the email and derive domain
    const bookingReport = await prisma.bookingReport.findFirst({
        where: {
            id: bookingReportId,
            organizationId,
        },
        select: {
            bookerEmail: true,
            reason: true,
        },
    });

    if (!bookingReport) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking report not found",
        });
    }

    // Extract domain from email
    const domain = bookingReport.bookerEmail.split("@")[1];
    if (!domain) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid email format",
        });
    }

    const repository = new PrismaOrganizationBlockListRepository(prisma);

    // Check if domain is already blocked
    const isAlreadyBlocked = await repository.isDomainBlocked(domain, organizationId);
    if (isAlreadyBlocked) {
        throw new TRPCError({
            code: "CONFLICT",
            message: "This domain is already blocked",
        });
    }

    return repository.createBlockedDomain({
        domain,
        organizationId,
        createdById: user.id,
        reason: `Blocked from report: ${bookingReport.reason}`,
        bookingReportId,
    });
};
