import { useState } from "react";
import type { ZodType } from "zod";

import type { SetAppDataGeneric, GetAppDataGeneric } from "../EventTypeAppContext";
import type { EventTypeAppCardApp } from "../types";

function useIsAppEnabled<TAppData extends ZodType>(
  app: EventTypeAppCardApp,
  getAppData: GetAppDataGeneric<TAppData>,
  setAppData: SetAppDataGeneric<TAppData>
) {
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

    if (newValue && app.credentialIds) {
      setAppData("credentialId", app.credentialIds[0]);
    }
    setEnabled(newValue);
  };

  return { enabled, updateEnabled };
}

export default useIsAppEnabled;
