"use client";

import { useState } from "react";

import { useLocale } from "@calcom/i18n/useLocale";
import { ToggleGroup } from "@calcom/ui/components/form";

import { AbuseConfigView } from "./AbuseConfigView";
import AbuseRulesView from "./AbuseRulesView";
import { LockedUsersView } from "./LockedUsersView";

type TabValue = "rules" | "locked_users" | "configuration";

export default function AbuseControlView() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabValue>("rules");

  return (
    <>
      <div className="mb-4">
        <ToggleGroup
          value={activeTab}
          onValueChange={(value) => {
            if (value) setActiveTab(value as TabValue);
          }}
          options={[
            { value: "rules", label: t("rules") },
            { value: "locked_users", label: t("locked_users") },
            { value: "configuration", label: t("configuration") },
          ]}
        />
      </div>

      {activeTab === "rules" && <AbuseRulesView />}
      {activeTab === "locked_users" && <LockedUsersView />}
      {activeTab === "configuration" && <AbuseConfigView />}
    </>
  );
}
