import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";

import type { EventTypeAppCardApp } from "../types";

function useIsAppEnabled(app: EventTypeAppCardApp) {
  const [getAppData, setAppData] = useAppContextWithSchema();
  const [enabled, setEnabled] = useState(() => {
    if (!app.credentialOwner) {
      return getAppData("enabled");
    }
    const credentialId = getAppData("credentialId");
    const isAppEnabledForCredential =
      app?.credentialIds && app.credentialIds.some((id) => id === credentialId);
    return isAppEnabledForCredential;
  });

  const updateEnabled = (newValue: boolean) => {
    if (!newValue) {
      setAppData("credentialId", undefined);
    }

    if (newValue && (app.userCredentialIds?.length || app.credentialOwner?.credentialId)) {
      setAppData("credentialId", app.credentialOwner?.credentialId || app.credentialIds[0]);
    }
    setEnabled(newValue);
  };

  return { enabled, updateEnabled };
}

export default useIsAppEnabled;
