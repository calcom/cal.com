import { router } from "@calcom/trpc/server/trpc";

import {
    getBlockedEmailsHandler,
    getBlockedDomainsHandler,
    getReportedBookingsHandler,
    createBlockedEmailHandler,
    createBlockedDomainHandler,
    deleteBlockedEmailHandler,
    deleteBlockedDomainHandler,
    ignoreReportHandler,
    blockEmailFromReportHandler,
    blockDomainFromReportHandler,
} from "./blockList.handler";
import {
    getBlockedEmailsSchema,
    getBlockedDomainsSchema,
    getReportedBookingsSchema,
    createBlockedEmailSchema,
    createBlockedDomainSchema,
    deleteBlockedEmailSchema,
    deleteBlockedDomainSchema,
    ignoreReportSchema,
    blockEmailFromReportSchema,
    blockDomainFromReportSchema,
} from "./blockList.schema";

export const blockListRouter = router({
    getBlockedEmails: router
        .input(getBlockedEmailsSchema)
        .query(getBlockedEmailsHandler),

    getBlockedDomains: router
        .input(getBlockedDomainsSchema)
        .query(getBlockedDomainsHandler),

    getReportedBookings: router
        .input(getReportedBookingsSchema)
        .query(getReportedBookingsHandler),

    createBlockedEmail: router
        .input(createBlockedEmailSchema)
        .mutation(createBlockedEmailHandler),

    createBlockedDomain: router
        .input(createBlockedDomainSchema)
        .mutation(createBlockedDomainHandler),

    deleteBlockedEmail: router
        .input(deleteBlockedEmailSchema)
        .mutation(deleteBlockedEmailHandler),

    deleteBlockedDomain: router
        .input(deleteBlockedDomainSchema)
        .mutation(deleteBlockedDomainHandler),

    ignoreReport: router
        .input(ignoreReportSchema)
        .mutation(ignoreReportHandler),

    blockEmailFromReport: router
        .input(blockEmailFromReportSchema)
        .mutation(blockEmailFromReportHandler),

    blockDomainFromReport: router
        .input(blockDomainFromReportSchema)
        .mutation(blockDomainFromReportHandler),
});
