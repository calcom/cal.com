import { Resource, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { UserPermissionRole } from "@calcom/prisma/enums";

import type { TabConfig, PermissionContext } from "./types";

export const SETTINGS_TABS: TabConfig[] = [
  {
    key: "my_account",
    name: "my_account",
    href: "/settings/my-account",
    icon: "user",
    children: [
      { key: "profile", name: "profile", href: "/settings/my-account/profile" },
      { key: "general", name: "general", href: "/settings/my-account/general" },
      { key: "calendars", name: "calendars", href: "/settings/my-account/calendars" },
      { key: "conferencing", name: "conferencing", href: "/settings/my-account/conferencing" },
      { key: "appearance", name: "appearance", href: "/settings/my-account/appearance" },
      { key: "out_of_office", name: "out_of_office", href: "/settings/my-account/out-of-office" },
      {
        key: "push_notifications",
        name: "push_notifications",
        href: "/settings/my-account/push-notifications",
      },
    ],
  },
  {
    key: "security",
    name: "security",
    href: "/settings/security",
    icon: "key",
    children: [
      { key: "password", name: "password", href: "/settings/security/password" },
      { key: "impersonation", name: "impersonation", href: "/settings/security/impersonation" },
      {
        key: "2fa_auth",
        name: "2fa_auth",
        href: "/settings/security/two-factor-auth",
        permissions: {
          custom: (ctx) => {
            // Hide 2FA if using Google SSO without password
            if (ctx.identityProvider === "GOOGLE" && !ctx.twoFactorEnabled && !ctx.passwordAdded) {
              return false;
            }
            return true;
          },
        },
      },
      {
        key: "sso_configuration",
        name: "sso_configuration",
        href: "/settings/security/sso",
        visibility: {
          selfHostedOnly: true,
        },
      },
    ],
  },
  {
    key: "billing",
    name: "billing",
    href: "/settings/billing",
    icon: "credit-card",
    children: [{ key: "manage_billing", name: "manage_billing", href: "/settings/billing" }],
  },
  {
    key: "developer",
    name: "developer",
    href: "/settings/developer",
    icon: "terminal",
    children: [
      { key: "webhooks", name: "webhooks", href: "/settings/developer/webhooks" },
      { key: "api_keys", name: "api_keys", href: "/settings/developer/api-keys" },
      {
        key: "admin_api",
        name: "admin_api",
        href: "/settings/organizations/admin-api",
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
        },
      },
    ],
  },
  {
    key: "organization",
    name: "organization",
    href: "/settings/organizations",
    visibility: {
      requiresOrg: true,
    },
    avatar: (ctx) => (ctx.organizationId ? "org-avatar" : undefined), // Will be replaced with actual avatar
    children: [
      { key: "org_profile", name: "profile", href: "/settings/organizations/profile" },
      { key: "org_general", name: "general", href: "/settings/organizations/general" },
      {
        key: "org_members",
        name: "members",
        href: (ctx) =>
          ctx.organizationSlug
            ? `${WEBAPP_URL}/settings/organizations/${ctx.organizationSlug}/members`
            : "/settings/organizations/members",
        isExternalLink: true,
        visibility: {
          requiresOrg: true,
        },
      },
      {
        key: "org_privacy",
        name: "privacy",
        href: "/settings/organizations/privacy",
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
        },
      },
      {
        key: "org_billing",
        name: "billing",
        href: "/settings/organizations/billing",
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
        },
      },
      {
        key: "org_attributes",
        name: "attributes",
        href: "/settings/organizations/attributes",
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
        },
      },
      {
        key: "org_oauth_clients",
        name: "OAuth Clients",
        href: "/settings/organizations/platform/oauth-clients",
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
        },
      },
      {
        key: "org_sso",
        name: "SSO",
        href: "/settings/organizations/sso",
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
        },
      },
      {
        key: "org_dsync",
        name: "directory_sync",
        href: "/settings/organizations/dsync",
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
        },
      },
      {
        key: "org_delegation",
        name: "delegation_credential",
        href: "/settings/organizations/delegation-credential",
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
          features: ["delegation-credential"],
        },
      },
      {
        key: "org_roles",
        name: "roles_and_permissions",
        href: "/settings/organizations/roles",
        permissions: {
          features: ["pbac"],
          resources: [
            {
              resource: Resource.Role,
              action: CrudAction.Read,
            },
          ],
        },
      },
      {
        key: "org_admin_api_docs",
        name: "admin_api",
        href: "https://cal.com/docs/enterprise-features/api/api-reference/bookings#admin-access",
        isExternalLink: true,
        permissions: {
          orgRoles: ["ADMIN", "OWNER"],
        },
      },
    ],
  },
  {
    key: "teams",
    name: "teams",
    href: "/teams",
    icon: "users",
    dynamic: true, // Will be populated dynamically with user's teams
    children: [],
  },
  {
    key: "other_teams",
    name: "other_teams",
    href: "/settings/organizations/teams/other",
    icon: "users",
    dynamic: true,
    permissions: {
      orgRoles: ["ADMIN", "OWNER"],
    },
    visibility: {
      requiresOrg: true,
    },
    children: [],
  },
  {
    key: "admin",
    name: "admin",
    href: "/settings/admin",
    icon: "lock",
    permissions: {
      roles: [UserPermissionRole.ADMIN],
    },
    children: [
      { key: "admin_features", name: "features", href: "/settings/admin/flags" },
      { key: "admin_license", name: "license", href: "/auth/setup?step=1" },
      { key: "admin_impersonation", name: "impersonation", href: "/settings/admin/impersonation" },
      { key: "admin_apps", name: "apps", href: "/settings/admin/apps/calendar" },
      { key: "admin_users", name: "users", href: "/settings/admin/users" },
      { key: "admin_organizations", name: "organizations", href: "/settings/admin/organizations" },
      { key: "admin_locked_sms", name: "lockedSMS", href: "/settings/admin/lockedSMS" },
      { key: "admin_oauth", name: "oAuth", href: "/settings/admin/oAuth" },
      {
        key: "admin_workspace_platforms",
        name: "Workspace Platforms",
        href: "/settings/admin/workspace-platforms",
      },
      { key: "admin_playground", name: "Playground", href: "/settings/admin/playground" },
      {
        key: "admin_create_org",
        name: "create_org",
        href: "/settings/organizations/new",
        visibility: {
          hostedOnly: true,
        },
      },
      {
        key: "admin_create_license",
        name: "create_license_key",
        href: "/settings/license-key/new",
        visibility: {
          hostedOnly: true,
        },
      },
    ],
  },
];

// Helper function to check if a tab href is a function
export function resolveTabHref(tab: TabConfig, context: PermissionContext): string {
  if (typeof tab.href === "function") {
    return tab.href(context);
  }
  return tab.href;
}
