"use client";

import { useEmbedQueryString } from "../../hooks/use-embed-query-string";
import { PersonalSettingsView } from "./personal-settings-view";

export const EmbedPersonalSettingsView = ({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName?: string;
}) => {
  const { queryString } = useEmbedQueryString();

  return (
    <PersonalSettingsView
      userEmail={userEmail}
      userName={userName}
      nextStepUrl={`/onboarding/personal/calendar?${queryString}`}
    />
  );
};
