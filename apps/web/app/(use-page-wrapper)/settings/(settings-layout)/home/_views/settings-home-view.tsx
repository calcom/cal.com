"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SearchIcon } from "@coss/ui/icons";

import type { SettingsItem, SettingsSection } from "./settings-home-data";
import { settingsSections } from "./settings-home-data";

export default function SettingsHomeView() {
  const { t } = useLocale();
  const orgBranding = useOrgBranding();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const hasOrg = !!orgBranding;

  const visibleSections = useMemo(
    () =>
      settingsSections.filter((section) => {
        if (section.visibility === "org") return hasOrg;
        return true;
      }),
    [hasOrg]
  );

  const filteredSections = useMemo(() => {
    if (!debouncedQuery || (debouncedQuery?.length ?? 0) < 2) return visibleSections;

    const lowerQuery = debouncedQuery.toLowerCase();

    return visibleSections
      .map((section) => {
        const filteredItems = section.items.filter((item) => {
          const title = t(item.titleKey).toLowerCase();
          const description = t(item.descriptionKey).toLowerCase();
          const keywords = item.keywords?.join(" ").toLowerCase() || "";

          return (
            title.includes(lowerQuery) || description.includes(lowerQuery) || keywords.includes(lowerQuery)
          );
        });

        return { ...section, items: filteredItems };
      })
      .filter((section) => section.items.length > 0);
  }, [debouncedQuery, visibleSections, t]);

  const hasNoResults = (debouncedQuery?.length ?? 0) >= 2 && filteredSections.length === 0;

  return (
    <div className="py-2">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-cal text-2xl font-semibold text-emphasis">{t("settings")}</h1>
        <TextField
          className="w-64"
          addOnLeading={<SearchIcon className="h-4 w-4 text-subtle" />}
          containerClassName="w-64"
          type="search"
          value={searchQuery}
          autoComplete="off"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("search")}
        />
      </div>
      {hasNoResults ? (
        <div className="py-12 text-center">
          <p className="text-subtle">{t("no_results")}</p>
        </div>
      ) : (
        filteredSections.map((section) => (
          <SectionGroup key={section.sectionTitleKey} section={section} t={t} />
        ))
      )}
    </div>
  );
}

function SectionGroup({ section, t }: { section: SettingsSection; t: (key: string) => string }) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-base font-semibold text-emphasis">{t(section.sectionTitleKey)}</h2>
      <div className="-ml-2 grid grid-cols-1 gap-x-3 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
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
      className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-subtle">
        <Icon name={item.icon} className="h-5 w-5 text-emphasis" />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium text-emphasis">
          {t(item.titleKey)}
          {item.isExternalLink && <Icon name="external-link" className="h-3 w-3 text-subtle" />}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-subtle">{t(item.descriptionKey)}</p>
      </div>
    </Component>
  );
}
