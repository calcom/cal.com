import { useState, useEffect } from "react";
import type { ZodType } from "zod";

import type { SetAppDataGeneric, GetAppDataGeneric } from "../EventTypeAppContext";
import type { EventTypeAppCardApp } from "../types";

function useIsAppEnabled<TAppData extends ZodType>(
  app: EventTypeAppCardApp,
  getAppData: GetAppDataGeneric<TAppData>,
  setAppData: SetAppDataGeneric<TAppData>
) {
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
    // App type is not being picked up in the type definition
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
}

export default useIsAppEnabled;
