import { Prisma } from "@calcom/prisma/client";
import { createBooking } from "../booking/createBooking";
import { getEventTypesFromDB } from "../eventTypes/getEventTypesFromDB";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { userOrgQuery } from "@calcom/features/ee/organizations/lib/orgDomains";
import prisma, { userSelect } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { HttpError } from "@calcom/lib/http-error";
import type { IncomingMessage } from "http";
import { findUsersByUsername } from "../findUsers/findUsersByUsername"

type Booking = Prisma.PromiseReturnType<typeof createBooking>;
export type NewBookingEventType =
    | Awaited<ReturnType<typeof getDefaultEvent>>
    | Awaited<ReturnType<typeof getEventTypesFromDB>>;

export const loadUsers = async (eventType: NewBookingEventType, dynamicUserList: string[], req: IncomingMessage) => {
    try {
        if (!eventType.id) {
            if (!Array.isArray(dynamicUserList) || dynamicUserList.length === 0) {
                throw new Error("dynamicUserList is not properly defined or empty.");
            }
            const { isValidOrgDomain, currentOrgDomain } = orgDomainConfig(req);
            const users = await findUsersByUsername({
                usernameList: dynamicUserList,
                orgSlug: isValidOrgDomain ? currentOrgDomain : null,
            });

            return users;
        }
        const hosts = eventType.hosts || [];

        if (!Array.isArray(hosts)) {
            throw new Error("eventType.hosts is not properly defined.");
        }

        const users = hosts.map(({ user, isFixed }) => ({
            ...user,
            isFixed,
        }));

        return users.length ? users : eventType.users;
    } catch (error) {
        if (error instanceof HttpError || error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new HttpError({ statusCode: 400, message: error.message });
        }
        throw new HttpError({ statusCode: 500, message: "Unable to load users" });
    }
};