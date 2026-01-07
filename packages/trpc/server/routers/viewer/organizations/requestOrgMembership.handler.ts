import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TRequestOrgMembershipInputSchema } from "./requestOrgMembership.schema";

type RequestOrgMembershipOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRequestOrgMembershipInputSchema;
};

export const requestOrgMembershipHandler = async ({ ctx, input }: RequestOrgMembershipOptions) => {
  const { user } = ctx;
  const { orgId } = input;

  // User should not already be in an organization
  if (user.organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are already a member of an organization",
    });
  }

  const organizationRepository = getOrganizationRepository();

  // Verify the organization exists and is verified
  const orgSettings = await organizationRepository.getOrganizationAutoAcceptSettings(orgId);

  if (!orgSettings || !orgSettings.isOrganizationVerified) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  // Verify user's email domain matches the org's auto accept email domain
  const emailDomain = user.email.split("@").at(-1);
  if (!emailDomain || emailDomain !== orgSettings.orgAutoAcceptEmail) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your email domain does not match the organization's domain",
    });
  }

  // Get the org name for the email
  const org = await organizationRepository.findById({ id: orgId });
  if (!org) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  // Get all admins and owners of the organization
  const adminsAndOwners = await organizationRepository.findAdminsAndOwnersByOrgId(orgId);

  if (adminsAndOwners.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No admins or owners found for this organization",
    });
  }

  // Send email to all admins and owners
  const { sendOrganizationJoinRequestEmail } = await import("@calcom/emails/organization-email-service");

  const userFullName = user.name || user.username || user.email;

  // Send email to each admin/owner
  await Promise.all(
    adminsAndOwners.map(async (member) => {
      const locale = member.user.locale || "en";
      const t = await getTranslation(locale, "common");

      return sendOrganizationJoinRequestEmail({
        language: t,
        to: {
          email: member.user.email,
        },
        userFullName,
        userEmail: user.email,
        orgName: org.name,
        orgId: org.id,
      });
    })
  );

  return { success: true };
};

export default requestOrgMembershipHandler;
