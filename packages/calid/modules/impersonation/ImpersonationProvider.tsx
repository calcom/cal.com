import type { User } from "@prisma/client";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { ensureOrganizationIsReviewed } from "@calcom/ee/organizations/lib/ensureOrganizationIsReviewed";
import { getSession } from "@calcom/features/auth/lib/getSession";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { CalIdMembership } from "@calcom/prisma/client";
import type { OrgProfile, PersonalProfile, UserAsPersonalProfile } from "@calcom/types/UserProfile";

// Schema definitions
const CalIdTeamIdValidator = z.object({
  calIdTeamId: z.preprocess((val) => parseInt(z.string().parse(val), 10), z.number().positive()),
});

// Type definitions
type UserProfile =
  | UserAsPersonalProfile
  | PersonalProfile
  | (Omit<OrgProfile, "organization"> & {
      organization: OrgProfile["organization"] & {
        members: CalIdMembership[];
      };
    });

interface ImpersonatedUserData extends Pick<User, "id" | "username" | "email" | "name" | "role" | "locale"> {
  organizationId: number | null;
  profile: UserProfile;
  calIdTeams: Array<{
    calIdTeamId: number;
    impersonation: boolean;
    role: string;
  }>;
}

type ImpersonationCredentials = Record<"username" | "teamId" | "returnToId", string> | undefined;

interface ReturnUserPayload {
  user: ImpersonatedUserData;
  impersonatedByUID: number;
  hasCalIdTeams: boolean;
}

// Validation utilities
class ImpersonationValidator {
  static extractCalIdTeamId(credentials: Partial<ImpersonationCredentials>): number | undefined {
    if (!credentials?.teamId) return undefined;
    return CalIdTeamIdValidator.parse({ calIdTeamId: credentials.teamId }).calIdTeamId;
  }

  static validateNotSelfImpersonation(
    userSession: Session | null,
    credentials: Partial<ImpersonationCredentials>
  ): void {
    const isSameUsername = userSession?.user.username === credentials?.username;
    const isSameEmail = userSession?.user.email === credentials?.username;

    if (isSameUsername || isSameEmail) {
      throw new Error("You cannot impersonate yourself.");
    }
  }

  static validateUserIdentifierPresent(credentials: Partial<ImpersonationCredentials>): void {
    const hasReturnId = !!credentials?.returnToId;
    const hasUsername = !!credentials?.username;

    if (!hasUsername && !hasReturnId) {
      throw new Error("User identifier must be present");
    }
  }

  static validateGlobalPermissions(userSession: Session | null): void {
    console.log("sessions is: ", JSON.stringify(userSession));

    const isNotAdmin = userSession?.user.role !== "ADMIN";
    const calIdTeamImpersonationDisabled = process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "false";
    const noSession = !userSession?.user;

    if ((isNotAdmin && calIdTeamImpersonationDisabled) || noSession) {
      throw new Error("You do not have permission to do this.");
    }
  }
}

// Database query utilities
class ImpersonationQueries {
  static async fetchTargetUser(
    identifier: string | undefined,
    calIdTeamFilter: Prisma.CalIdMembershipWhereInput
  ) {
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        email: true,
        disableImpersonation: true,
        locale: true,
        calIdTeams: {
          where: calIdTeamFilter,
          select: {
            calIdTeamId: true,
            impersonation: true,
            role: true,
          },
        },
      },
    });

    if (!targetUser) {
      throw new Error("This user does not exist");
    }

    return targetUser;
  }

  static async fetchReturningUser(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        locale: true,
        profiles: true,
        calIdTeams: {
          where: { acceptedInvitation: true },
          select: {
            calIdTeamId: true,
            impersonation: true,
            role: true,
          },
        },
      },
    });
  }

  static async logImpersonationAudit(targetUserId: number, initiatorUserId: number): Promise<void> {
    await prisma.impersonations.create({
      data: {
        impersonatedBy: { connect: { id: initiatorUserId } },
        impersonatedUser: { connect: { id: targetUserId } },
      },
    });
  }

  static async fetchInitiatorMetadata(initiatorId: number) {
    const initiator = await prisma.user.findUnique({
      where: { id: initiatorId },
      select: { id: true, role: true },
    });

    if (!initiator) {
      throw new Error("This user does not exist.");
    }

    return initiator;
  }
}

// Profile utilities
class ProfileManager {
  static async resolveUserProfile(user: { id: number; username: string | null }): Promise<UserProfile> {
    const allProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser({
      id: user.id,
      username: user.username,
    });

    const primaryProfile = allProfiles[0];

    if (!primaryProfile.organizationId) {
      return primaryProfile;
    }

    const organizationMembers = await prisma.calIdMembership.findMany({
      where: { calIdTeamId: primaryProfile.organizationId },
    });

    return {
      ...primaryProfile,
      organization: {
        ...primaryProfile.organization!,
        members: organizationMembers,
      },
    };
  }
}

// Business logic handlers
class ImpersonationHandlers {
  static buildCalIdTeamFilter(
    userSession: Session | null,
    targetCalIdTeamId: number | undefined
  ): Prisma.CalIdMembershipWhereInput {
    const baseFilter: Prisma.CalIdMembershipWhereInput = {
      impersonation: true,
      acceptedInvitation: true,
      calIdTeam: { id: targetCalIdTeamId },
    };

    const hasOrgContext = userSession?.user.org?.id;
    const isOrgDifferent = hasOrgContext && userSession.user.org.id !== targetCalIdTeamId;
    const isNotAdmin = userSession?.user.role !== "ADMIN";

    if (isOrgDifferent && isNotAdmin) {
      return {
        impersonation: true,
        acceptedInvitation: true,
        calIdTeam: { id: userSession.user.org.id },
      };
    }

    return baseFilter;
  }

  static async resolveTargetUserData(
    userSession: Session | null,
    targetCalIdTeamId: number | undefined,
    credentials: ImpersonationCredentials | null
  ): Promise<ImpersonatedUserData> {
    const calIdTeamFilter = this.buildCalIdTeamFilter(userSession, targetCalIdTeamId);
    const targetUser = await ImpersonationQueries.fetchTargetUser(credentials?.username, calIdTeamFilter);
    const userProfile = await ProfileManager.resolveUserProfile(targetUser);

    return {
      ...targetUser,
      organizationId: userProfile.organization?.id ?? null,
      profile: userProfile,
    };
  }

  static async handleReturnToOriginalUser(
    userSession: Session | null,
    credentials: ImpersonationCredentials | null
  ): Promise<ReturnUserPayload | undefined> {
    const originalUserId = userSession?.user.impersonatedBy?.id;
    const requestedReturnId = credentials?.returnToId;

    if (!originalUserId || !requestedReturnId) return undefined;

    const parsedReturnId = parseInt(requestedReturnId, 10);
    if (originalUserId !== parsedReturnId) return undefined;

    const originalUser = await ImpersonationQueries.fetchReturningUser(parsedReturnId);
    if (!originalUser) return undefined;

    const hasOrgContext =
      originalUser.organizationId || originalUser.profiles.some((p) => p.organizationId !== undefined);

    const canReturn = originalUser.role === "ADMIN" || hasOrgContext;
    if (!canReturn) return undefined;

    const userProfile = await ProfileManager.resolveUserProfile(originalUser);

    return {
      user: {
        id: originalUser.id,
        email: originalUser.email,
        locale: originalUser.locale,
        name: originalUser.name,
        organizationId: originalUser.organizationId,
        role: originalUser.role,
        username: originalUser.username,
        profile: userProfile,
      },
      impersonatedByUID: originalUserId,
      hasCalIdTeams: originalUser.calIdTeams.length >= 1,
    };
  }

  static async buildFinalResponse(
    targetUser: ImpersonatedUserData,
    initiatorId: number,
    hasActiveCalIdTeam: boolean,
    isReturning = false
  ) {
    await ImpersonationQueries.logImpersonationAudit(targetUser.id, initiatorId);

    const baseResponse = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      belongsToActiveCalIdTeam: hasActiveCalIdTeam,
      organizationId: targetUser.organizationId,
      locale: targetUser.locale,
      profile: targetUser.profile,
    };

    if (isReturning) {
      return baseResponse;
    }

    const initiatorData = await ImpersonationQueries.fetchInitiatorMetadata(initiatorId);

    return {
      ...baseResponse,
      impersonatedBy: {
        id: initiatorData.id,
        role: initiatorData.role,
      },
    };
  }

  static async validateCalIdTeamPermissions(
    userSession: Session | null,
    targetUser: ImpersonatedUserData,
    calIdTeamId: number
  ): Promise<void> {
    const sessionUserDetails = await prisma.user.findUnique({
      where: { id: userSession?.user.id },
      include: {
        calIdTeams: {
          where: {
            AND: [{ role: { in: ["ADMIN", "OWNER"] } }, { calIdTeam: { id: calIdTeamId } }],
          },
          select: { role: true },
        },
      },
    });

    const initiatorHasNoCalIdTeams = sessionUserDetails?.calIdTeams.length === 0;
    const targetHasNoCalIdTeams = targetUser.calIdTeams.length === 0;

    if (initiatorHasNoCalIdTeams || targetHasNoCalIdTeams) {
      throw new Error("Error-UserHasNoCalIdTeams: You do not have permission to do this.");
    }

    const initiatorRole = sessionUserDetails?.calIdTeams[0].role;
    const targetRole = targetUser.calIdTeams[0].role;

    if (initiatorRole === "ADMIN" && targetRole === "OWNER") {
      throw new Error("You do not have permission to do this.");
    }
  }
}

// Main provider
const ImpersonationProvider = CredentialsProvider({
  id: "impersonation-auth",
  name: "Impersonation",
  type: "credentials",
  credentials: {
    username: { type: "text" },
    calIdTeamId: { type: "text" },
    returnToId: { type: "text" },
  },
  async authorize(creds, req) {
    // @ts-ignore - Session typing issue with req
    const activeSession = await getSession({ req });
    const extractedCalIdTeamId = ImpersonationValidator.extractCalIdTeamId(creds);

    ImpersonationValidator.validateNotSelfImpersonation(activeSession, creds);
    ImpersonationValidator.validateUserIdentifierPresent(creds);

    // Handle return-to-original-user flow
    const returnPayload = await ImpersonationHandlers.handleReturnToOriginalUser(activeSession, creds);
    if (returnPayload) {
      return ImpersonationHandlers.buildFinalResponse(
        returnPayload.user,
        returnPayload.impersonatedByUID,
        returnPayload.hasCalIdTeams,
        true
      );
    }

    ImpersonationValidator.validateGlobalPermissions(activeSession);

    const targetUserData = await ImpersonationHandlers.resolveTargetUserData(
      activeSession,
      extractedCalIdTeamId,
      creds
    );

    // Admin flow - simplified permissions
    if (activeSession?.user.role === "ADMIN") {
      if (targetUserData.disableImpersonation) {
        throw new Error("This user has disabled Impersonation.");
      }

      return ImpersonationHandlers.buildFinalResponse(
        targetUserData,
        activeSession.user.id as number,
        targetUserData.calIdTeams.length > 0
      );
    }

    // Organization review check
    await ensureOrganizationIsReviewed(activeSession?.user.org?.id);

    if (!extractedCalIdTeamId) {
      throw new Error("Error-calIdTeamNotFound: You do not have permission to do this.");
    }

    // CalIdTeam-based permissions validation
    await ImpersonationHandlers.validateCalIdTeamPermissions(
      activeSession,
      targetUserData,
      extractedCalIdTeamId
    );

    return ImpersonationHandlers.buildFinalResponse(
      targetUserData,
      activeSession?.user.id as number,
      targetUserData.calIdTeams.length > 0
    );
  },
});

export default ImpersonationProvider;
