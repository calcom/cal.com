import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { MembershipRole } from "@calcom/prisma/enums";
import type { CreationSource } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TFunction } from "i18next";

import {
    findUsersWithInviteStatus,
    getOrgConnectionInfo,
    getOrgState,
    getTeamOrThrow,
    getUniqueInvitationsOrThrowIfEmpty,
    handleExistingUsersInvites,
    handleNewUsersInvites,
    INVITE_STATUS,
} from "./inviteMembersUtils";
import type { Invitation, TargetTeam, TeamWithParent } from "./inviteMembersUtils";

const log = logger.getSubLogger({ prefix: ["inviteMember.service"] });

function getOrgConnectionInfoGroupedByUsernameOrEmail({
    uniqueInvitations,
    orgState,
    team,
    isOrg,
}: {
    uniqueInvitations: { usernameOrEmail: string; role: MembershipRole }[];
    orgState: ReturnType<typeof getOrgState>;
    team: Pick<TeamWithParent, "parentId" | "id">;
    isOrg: boolean;
}) {
    return uniqueInvitations.reduce((acc, invitation) => {
        return {
            ...acc,
            [invitation.usernameOrEmail]: getOrgConnectionInfo({
                orgVerified: orgState.orgVerified,
                orgAutoAcceptDomain: orgState.autoAcceptEmailDomain,
                email: invitation.usernameOrEmail,
                team,
                isOrg: isOrg,
            }),
        };
    }, {} as Record<string, ReturnType<typeof getOrgConnectionInfo>>);
}

function getInvitationsForNewUsers({
    existingUsersToBeInvited,
    uniqueInvitations,
}: {
    existingUsersToBeInvited: Awaited<ReturnType<typeof findUsersWithInviteStatus>>;
    uniqueInvitations: { usernameOrEmail: string; role: MembershipRole }[];
}) {
    const existingUsersEmailsAndUsernames = existingUsersToBeInvited.reduce(
        (acc, user) => ({
            emails: user.email ? [...acc.emails, user.email] : acc.emails,
            usernames: user.username ? [...acc.usernames, user.username] : acc.usernames,
        }),
        { emails: [], usernames: [] } as { emails: string[]; usernames: string[] }
    );
    return uniqueInvitations.filter(
        (invitation) =>
            !existingUsersEmailsAndUsernames.emails.includes(invitation.usernameOrEmail) &&
            !existingUsersEmailsAndUsernames.usernames.includes(invitation.usernameOrEmail)
    );
}

function throwIfInvalidInvitationStatus({
    firstExistingUser,
    translation,
}: {
    firstExistingUser: Awaited<ReturnType<typeof findUsersWithInviteStatus>>[number] | undefined;
    translation: TFunction;
}) {
    if (firstExistingUser && firstExistingUser.canBeInvited !== INVITE_STATUS.CAN_BE_INVITED) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: translation(firstExistingUser.canBeInvited),
        });
    }
}

function shouldBeSilentAboutErrors(invitations: Invitation[]) {
    const isBulkInvite = invitations.length > 1;
    return isBulkInvite;
}

export const inviteMembersWithNoInviterPermissionCheck = async (
    data: {
        // TODO: Remove `input` and instead pass the required fields directly
        language: string;
        inviterName: string | null;
        orgSlug: string | null;
        invitations: {
            usernameOrEmail: string;
            role: MembershipRole;
        }[];
        creationSource: CreationSource;
        /**
         * Whether invitation is a direct user action or not i.e. we need to show them User based errors like inviting existing users or not.
         */
        isDirectUserAction?: boolean;
    } & TargetTeam
) => {
    const { inviterName, orgSlug, invitations, language, creationSource, isDirectUserAction = true } = data;
    const myLog = log.getSubLogger({ prefix: ["inviteMembers"] });
    const translation = await getTranslation(language ?? "en", "common");
    // @ts-expect-error - Checking for team existence manually if not provided
    const team = "team" in data ? data.team : await getTeamOrThrow(data.teamId);
    const isTeamAnOrg = team.isOrganization;

    const uniqueInvitations = await getUniqueInvitationsOrThrowIfEmpty(invitations);
    const beSilentAboutErrors = shouldBeSilentAboutErrors(uniqueInvitations) || !isDirectUserAction;
    const existingUsersToBeInvited = await findUsersWithInviteStatus({
        invitations: uniqueInvitations,
        team,
    });

    if (!beSilentAboutErrors) {
        // beSilentAboutErrors is false only when there is a single user being invited, so we just check the first user status here
        throwIfInvalidInvitationStatus({ firstExistingUser: existingUsersToBeInvited[0], translation });
    }

    const orgState = getOrgState(isTeamAnOrg, team);

    const orgConnectInfoByUsernameOrEmail = getOrgConnectionInfoGroupedByUsernameOrEmail({
        uniqueInvitations,
        orgState,
        team: {
            parentId: team.parentId,
            id: team.id,
        },
        isOrg: isTeamAnOrg,
    });

    const invitationsForNewUsers = getInvitationsForNewUsers({
        existingUsersToBeInvited,
        uniqueInvitations,
    });

    const inviter = { name: inviterName };

    if (invitationsForNewUsers.length) {
        await handleNewUsersInvites({
            invitationsForNewUsers,
            team,
            orgConnectInfoByUsernameOrEmail,
            teamId: team.id,
            language,
            isOrg: isTeamAnOrg,
            inviter,
            autoAcceptEmailDomain: orgState.autoAcceptEmailDomain,
            creationSource,
        });
    }

    // Existing users have a criteria to be invited
    const invitableExistingUsers = existingUsersToBeInvited.filter(
        (invitee) => invitee.canBeInvited === INVITE_STATUS.CAN_BE_INVITED
    );

    myLog.debug(
        "Notable variables:",
        safeStringify({
            uniqueInvitations,
            orgConnectInfoByUsernameOrEmail,
            invitableExistingUsers,
            existingUsersToBeInvited,
            invitationsForNewUsers,
        })
    );

    if (invitableExistingUsers.length) {
        await handleExistingUsersInvites({
            invitableExistingUsers,
            team,
            orgConnectInfoByUsernameOrEmail,
            teamId: team.id,
            language,
            isOrg: isTeamAnOrg,
            inviter,
            orgSlug,
        });
    }

    const teamBillingServiceFactory = getTeamBillingServiceFactory();
    const teamBillingService = teamBillingServiceFactory.init(team);
    await teamBillingService.updateQuantity();

    return {
        // TODO: Better rename it to invitations only maybe?
        usernameOrEmail:
            invitations.length == 1
                ? invitations[0].usernameOrEmail
                : invitations.map((invitation) => invitation.usernameOrEmail),
        numUsersInvited: invitableExistingUsers.length + invitationsForNewUsers.length,
    };
};
