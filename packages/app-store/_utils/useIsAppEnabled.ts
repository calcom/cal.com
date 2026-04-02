import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import { useState } from "react";
import type { EventTypeAppCardApp } from "../types";

function useIsAppEnabled(app: EventTypeAppCardApp) {
  const { getAppData, setAppData } = useAppContextWithSchema();
  const [enabled, setEnabled] = useState(() => {
    const isAppEnabled = getAppData("enabled");

    if (!app.credentialOwner) {
      return isAppEnabled ?? false; // Default to false if undefined
    }

    const credentialId = getAppData("credentialId");
    const isAppEnabledForCredential =
      isAppEnabled &&
      (app.userCredentialIds.some((id: number) => id === credentialId) ||
        app.credentialOwner.credentialId === credentialId);
    return isAppEnabledForCredential ?? false; // Default to false if undefined
  });

  const updateEnabled = (newValue: boolean) => {
    if (!newValue) {
      setAppData("credentialId", undefined);
    }

    if (newValue && (app.userCredentialIds?.length || app.credentialOwner?.credentialId)) {
      setAppData("credentialId", app.credentialOwner?.credentialId || app.userCredentialIds[0]);
    }
    setEnabled(newValue);
  };

  return { enabled, updateEnabled };
}

export default useIsAppEnabled;
