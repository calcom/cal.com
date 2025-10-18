import { z } from "zod";

export const getBlockedEmailsSchema = z.object({
    organizationId: z.number(),
    skip: z.number().optional().default(0),
    take: z.number().optional().default(20),
});

export const getBlockedDomainsSchema = z.object({
    organizationId: z.number(),
    skip: z.number().optional().default(0),
    take: z.number().optional().default(20),
});

export const getReportedBookingsSchema = z.object({
    organizationId: z.number(),
    skip: z.number().optional().default(0),
    take: z.number().optional().default(20),
});

export const createBlockedEmailSchema = z.object({
    email: z.string().email(),
    organizationId: z.number(),
    reason: z.string().optional(),
    bookingReportId: z.string().optional(),
});

export const createBlockedDomainSchema = z.object({
    domain: z.string().min(1),
    organizationId: z.number(),
    reason: z.string().optional(),
    bookingReportId: z.string().optional(),
});

export const deleteBlockedEmailSchema = z.object({
    id: z.string(),
    organizationId: z.number(),
});

export const deleteBlockedDomainSchema = z.object({
    id: z.string(),
    organizationId: z.number(),
});

export const ignoreReportSchema = z.object({
    bookingReportId: z.string(),
    organizationId: z.number(),
});

export const blockEmailFromReportSchema = z.object({
    bookingReportId: z.string(),
    organizationId: z.number(),
});

export const blockDomainFromReportSchema = z.object({
    bookingReportId: z.string(),
    organizationId: z.number(),
});
