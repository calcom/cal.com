import { useState, useEffect } from "react";

import type { EventTypeAppCardApp } from "../types";

const useIsAppEnabled = (app: EventTypeAppCardApp, getAppData: unknown, setAppData: unknown) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (!app.credentialOwner) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      setEnabled(getAppData("enabled"));
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const credentialId = getAppData("credentialId");

    // For pre-org team event types assume that the app used was the user's if enabled
    if (!credentialId) {
      if (!app.credentialOwner?.teamId) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setEnabled(getAppData("enabled"));
      }
    }

    if (app?.credentialIds && app.credentialIds.some((id) => id === credentialId)) {
      setEnabled(true);
    }
    return;
  }, []);

  // If the app is enabled then we should also write the credentialId to the app metadata
  useEffect(() => {
    if (enabled && app.credentialIds) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      setAppData("credentialId", app.credentialIds[0]);
    }
    if (!enabled) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      setAppData("credentialId", undefined);
    }
  }, [enabled]);

  const updateEnabled = (newValue: boolean) => {
    setEnabled(newValue);
  };

  return { enabled, updateEnabled };
};

export default useIsAppEnabled;
