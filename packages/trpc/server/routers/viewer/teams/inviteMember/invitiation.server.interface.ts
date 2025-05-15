import type { TFunction } from "i18next";

import type { MembershipRole } from "@calcom/prisma/enums";
import type { CreationSource } from "@calcom/prisma/enums";

import type { TeamWithParent } from "./types";

type InvitableUser = {
  id: number;
  email: string;
  username: string | null;
  completedOnboarding: boolean;
  identityProvider: string;
  password: { hash: string } | null;
  profile: { username: string } | null;
  newRole: MembershipRole;
  needToCreateProfile: boolean | null;
  needToCreateOrgMembership: boolean | null;
};

type Invitation = {
  usernameOrEmail: string;
  role: MembershipRole;
};

export interface IInvitationService {
  sendEmails(emailPromises: Promise<void>[]): Promise<void>;
  sendExistingUserTeamInviteEmails(params: {
    language: TFunction;
    isAutoJoin: boolean;
    existingUsersWithMemberships: InvitableUser[];
    currentUserTeamName?: string;
    currentUserParentTeamName: string | undefined;
    currentUserName?: string | null;
    isOrg: boolean;
    teamId: number;
    orgSlug: string | null;
  }): Promise<void>;
  sendSignupToOrganizationEmail(params: {
    usernameOrEmail: string;
    team: { name: string; parent: { name: string } | null };
    translation: TFunction;
    inviterName: string;
    teamId: number;
    isOrg: boolean;
  }): Promise<void>;
  handleExistingUsersInvites(params: {
    invitableUsers: InvitableUser[];
    team: TeamWithParent;
    orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
    teamId: number;
    language: TFunction;
    inviter: { name: string | null };
    orgSlug: string | null;
    isOrg: boolean;
  }): Promise<void>;
  handleNewUsersInvites(params: {
    invitationsForNewUsers: Invitation[];
    team: TeamWithParent;
    orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
    teamId: number;
    language: TFunction;
    isOrg: boolean;
    autoAcceptEmailDomain: string | null;
    inviter: { name: string | null };
    creationSource: CreationSource;
  }): Promise<void>;
}
