"use client";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { Icon } from "@calcom/ui/components/icon";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { SettingsItem, SettingsSection } from "~/settings/home/settings-home-data";
import { settingsSections } from "~/settings/home/settings-home-data";

export default function SettingsHomeView() {
  const { t } = useLocale();
  const session = useSession();
  const orgBranding = useOrgBranding();

  const hasOrg = !!orgBranding;
  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;

  const visibleSections = settingsSections.filter((section) => {
    if (section.visibility === "org") return hasOrg;
    if (section.visibility === "admin") return isAdmin;
    return true;
  });

  return (
    <div className="py-2">
      <div className="mb-8">
        <h1 className="font-cal font-semibold text-2xl text-emphasis">{t("settings")}</h1>
      </div>
      {visibleSections.map((section) => (
        <SectionGroup key={section.sectionTitleKey} section={section} t={t} />
      ))}
    </div>
  );
}

function SectionGroup({ section, t }: { section: SettingsSection; t: (key: string) => string }) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 font-semibold text-base text-emphasis">{t(section.sectionTitleKey)}</h2>
      <div className="grid grid-cols-1 gap-x-3 gap-y-4 md:grid-cols-2 lg:grid-cols-3 -ml-2">
        {section.items.map((item) => (
          <SettingsItemCard key={item.href} item={item} t={t} />
        ))}
      </div>
    </div>
  );
}

function SettingsItemCard({ item, t }: { item: SettingsItem; t: (key: string) => string }) {
  const Component = item.isExternalLink ? "a" : Link;
  const linkProps = item.isExternalLink
    ? { href: item.href, target: "_blank" as const, rel: "noreferrer" }
    : { href: item.href };

  return (
    <Component
      {...linkProps}
      className="flex items-start gap-3 rounded-md transition-colors hover:bg-muted p-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-200">
        <Icon name={item.icon} className="h-5 w-5 text-gray-800" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-emphasis text-sm flex items-center gap-1.5">
          {t(item.titleKey)}
          {item.isExternalLink && <Icon name="external-link" className="h-3 w-3 text-subtle" />}
        </p>
        <p className="mt-0.5 text-subtle text-xs leading-relaxed">{t(item.descriptionKey)}</p>
      </div>
    </Component>
  );
}
