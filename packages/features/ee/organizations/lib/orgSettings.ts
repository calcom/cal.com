import type { OrganizationSettings } from "@calcom/prisma/client";

type MinimumOrganizationSettings = Pick<
  OrganizationSettings,
  | "orgAutoAcceptEmail"
  | "orgProfileRedirectsToVerifiedDomain"
  | "allowSEOIndexing"
  | "disableAutofillOnBookingPage"
>;

type SEOOrganizationSettings = Pick<OrganizationSettings, "allowSEOIndexing">;

export const getOrganizationSettings = (team: {
  isOrganization: boolean;
  organizationSettings: MinimumOrganizationSettings | null;
  parent: {
    organizationSettings: MinimumOrganizationSettings | null;
  } | null;
}) => {
  if (!team) return null;
  if (team.isOrganization) return team.organizationSettings ?? null;
  if (!team.parent) return null;
  return team.parent.organizationSettings ?? null;
};

export const getOrganizationSEOSettings = (team: {
  isOrganization: boolean;
  organizationSettings: SEOOrganizationSettings | null;
  parent: {
    organizationSettings: SEOOrganizationSettings | null;
  } | null;
}) => {
  if (!team) return null;
  if (team.isOrganization) return team.organizationSettings ?? null;
  if (!team.parent) return null;
  return team.parent.organizationSettings ?? null;
};

export const getVerifiedDomain = (settings: Pick<OrganizationSettings, "orgAutoAcceptEmail">) => {
  return settings.orgAutoAcceptEmail;
};
