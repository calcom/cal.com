"use client";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getI18nEditAttributes } from "@calcom/lib/i18nEditMode";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { ReactElement } from "react";
import { useState } from "react";
import EventTypes, { EventTypesCTA, SearchContext } from "~/event-types/views/event-types-listing-view";

type GetUserEventGroupsResponse = Parameters<typeof EventTypesCTA>[0]["userEventGroupsData"];

const CTAWithContext = ({
  userEventGroupsData,
}: {
  userEventGroupsData: GetUserEventGroupsResponse;
}): ReactElement => {
  return <EventTypesCTA userEventGroupsData={userEventGroupsData} />;
};

export function EventTypesWrapper({
  userEventGroupsData,
  user,
}: {
  userEventGroupsData: GetUserEventGroupsResponse;
  user: {
    id: number;
    completedOnboarding?: boolean;
  } | null;
}): ReactElement {
  const { t, i18n } = useLocale();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const i18nEdit = (key: string) => getI18nEditAttributes(key, locale);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm, debouncedSearchTerm }}>
      <ShellMainAppDir
        heading={<span {...i18nEdit("event_types_page_title")}>{t("event_types_page_title")}</span>}
        subtitle={<span {...i18nEdit("event_types_page_subtitle")}>{t("event_types_page_subtitle")}</span>}
        CTA={<CTAWithContext userEventGroupsData={userEventGroupsData} />}>
        <EventTypes userEventGroupsData={userEventGroupsData} user={user} />
      </ShellMainAppDir>
    </SearchContext.Provider>
  );
}
