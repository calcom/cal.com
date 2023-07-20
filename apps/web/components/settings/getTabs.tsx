"use server ";

import { User, Key, CreditCard, Terminal, Building, Users, Lock } from "lucide-react";

import { HOSTED_CAL_FEATURES, WEBAPP_URL } from "@calcom/lib/constants";
import { IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";

import { getServerSession } from "@lib/getServerSession";

const tabs: VerticalTabItemProps[] = [
  {
    name: "my_account",
    href: "/settings/my-account",
    icon: User,
    children: [
      { name: "profile", href: "/settings/my-account/profile" },
      { name: "general", href: "/settings/my-account/general" },
      { name: "calendars", href: "/settings/my-account/calendars" },
      { name: "conferencing", href: "/settings/my-account/conferencing" },
      { name: "appearance", href: "/settings/my-account/appearance" },
      // TODO
      // { name: "referrals", href: "/settings/my-account/referrals" },
    ],
  },
  {
    name: "security",
    href: "/settings/security",
    icon: Key,
    children: [
      { name: "password", href: "/settings/security/password" },
      { name: "impersonation", href: "/settings/security/impersonation" },
      { name: "2fa_auth", href: "/settings/security/two-factor-auth" },
    ],
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: CreditCard,
    children: [{ name: "manage_billing", href: "/settings/billing" }],
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: Terminal,
    children: [
      //
      { name: "webhooks", href: "/settings/developer/webhooks" },
      { name: "api_keys", href: "/settings/developer/api-keys" },
      // TODO: Add profile level for embeds
      // { name: "embeds", href: "/v2/settings/developer/embeds" },
    ],
  },
  {
    name: "organization",
    href: "/settings/organizations",
    icon: Building,
    children: [
      {
        name: "profile",
        href: "/settings/organizations/profile",
      },
      {
        name: "general",
        href: "/settings/organizations/general",
      },
      {
        name: "members",
        href: "/settings/organizations/members",
      },
      {
        name: "appearance",
        href: "/settings/organizations/appearance",
      },
      {
        name: "billing",
        href: "/settings/organizations/billing",
      },
    ],
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: Users,
    children: [],
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: Lock,
    children: [
      //
      { name: "features", href: "/settings/admin/flags" },
      { name: "license", href: "/auth/setup?step=1" },
      { name: "impersonation", href: "/settings/admin/impersonation" },
      { name: "apps", href: "/settings/admin/apps/calendar" },
      { name: "users", href: "/settings/admin/users" },
      { name: "organizations", href: "/settings/admin/organizations" },
    ],
  },
];

tabs.find((tab) => {
  // Add "SAML SSO" to the tab
  if (tab.name === "security" && !HOSTED_CAL_FEATURES) {
    tab.children?.push({ name: "sso_configuration", href: "/settings/security/sso" });
  }
});

// The following keys are assigned to admin only
const adminRequiredKeys = ["admin"];
const organizationRequiredKeys = ["organization"];

export const getTabs = async () => {
  const session = await getServerSession();
  const user = await prisma.user.findUnique({
    where: {
      id: session?.user.id,
    },
    select: {
      name: true,
      username: true,
      organizationId: true,
      role: true,
      email: true,
      identityProvider: true,
    },
  });
  const avatar = `${WEBAPP_URL}/${user.username}/avatar.png`;

  const isAdmin = user.role === UserPermissionRole.ADMIN;

  tabs.map((tab) => {
    if (tab.href === "/settings/my-account") {
      tab.name = user?.name || "my_account";
      tab.icon = undefined;
      tab.avatar = avatar;
    } else if (tab.href === "/settings/security" && user?.identityProvider === IdentityProvider.GOOGLE) {
      tab.children = tab?.children?.filter(
        (childTab) => childTab.href !== "/settings/security/two-factor-auth"
      );
    }
    return tab;
  });

  // check if name is in adminRequiredKeys
  return tabs.filter((tab) => {
    if (organizationRequiredKeys.includes(tab.name)) return !!user?.organizationId;

    if (isAdmin) return true;
    return !adminRequiredKeys.includes(tab.name);
  });
};
