"use client";

import { useState } from "react";

import { useCompatSearchParams } from "@calcom/embed-core/src/useCompatSearchParams";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import CreateNewOutOfOfficeEntryButton from "./CreateNewOutOfOfficeEntryButton";
import { OutOfOfficeEntriesList } from "./OutOfOfficeEntriesList";
import { OutOfOfficeTab, OutOfOfficeToggleGroup } from "./OutOfOfficeToggleGroup";

export const OutOfOfficeSettingsHeader = () => {
  const { t } = useLocale();
  const searchParams = useCompatSearchParams();
  const [oooEntriesAdded, setOOOEntriesAdded] = useState(0);
  const selectedTab = searchParams?.get("type") ?? OutOfOfficeTab.MINE;

  return (
    <SettingsHeader
      title={t("out_of_office")}
      description={
        selectedTab === OutOfOfficeTab.TEAM
          ? t("out_of_office_team_description")
          : t("out_of_office_description")
      }
      CTA={
        <div className="flex gap-2">
          <OutOfOfficeToggleGroup />
          <CreateNewOutOfOfficeEntryButton
            setOOOEntriesAdded={setOOOEntriesAdded}
            data-testid="add_entry_ooo"
          />
        </div>
      }>
      <OutOfOfficeEntriesList oooEntriesAdded={oooEntriesAdded} setOOOEntriesAdded={setOOOEntriesAdded} />
    </SettingsHeader>
  );
};
