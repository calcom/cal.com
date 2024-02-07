import { UserRepository } from "@calcom/lib/server/repository/user";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential"
import prisma, { userSelect } from "@calcom/prisma";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[api] book:user"] });

/**
 * This method is mostly same as the one in UserRepository but it includes a lot more relations which are specific requirement here
 * TODO: Figure out how to keep it in UserRepository and use it here
 */
export const findUsersByUsername = async ({
    usernameList,
    orgSlug,
}: {
    orgSlug: string | null;
    usernameList: string[];
}) => {
    log.debug("findUsersByUsername", { usernameList, orgSlug });
    const { where, profiles } = await UserRepository._getWhereClauseForFindingUsersByUsername({
        orgSlug,
        usernameList,
    });
    return (
        await prisma.user.findMany({
            where,
            select: {
                ...userSelect.select,
                credentials: {
                    select: credentialForCalendarServiceSelect,
                },
                metadata: true,
            },
        })
    ).map((user) => {
        const profile = profiles?.find((profile) => profile.user.id === user.id) ?? null;
        return {
            ...user,
            organizationId: profile?.organizationId ?? null,
            profile,
        };
    });
};