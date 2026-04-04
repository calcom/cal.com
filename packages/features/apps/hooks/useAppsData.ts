import type { GetAppData, SetAppData } from "@calcom/app-store/EventTypeAppContext";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useFormContext } from "react-hook-form";

const useAppsData = () => {
  const formMethods = useFormContext<FormValues>();
  const allAppsData = formMethods.watch("metadata")?.apps || {};

  const setAllAppsData = (_allAppsData: typeof allAppsData) => {
    formMethods.setValue(
      "metadata",
      {
        ...formMethods.getValues("metadata"),
        apps: _allAppsData,
      },
      { shouldDirty: true }
    );
  };

  const getAppDataGetter = (appId: EventTypeAppsList): GetAppData => {
    return (key) => {
      const appData = allAppsData[appId as keyof typeof allAppsData] || {};
      if (key) {
        return appData[key as keyof typeof appData];
      }
      return appData;
    };
  };

  const eventTypeFormMetadata = formMethods.getValues("metadata");

  const getAppDataSetter = (
    appId: EventTypeAppsList,
    appCategories: string[],
    credentialId?: number
  ): SetAppData => {
    return (key, value) => {
      // Always get latest data available in Form because consequent calls to setData would update the Form but not allAppsData(it would update during next render)
      const allAppsDataFromForm = formMethods.getValues("metadata")?.apps || {};
      const appData = allAppsDataFromForm[appId];
      setAllAppsData({
        ...allAppsDataFromForm,
        [appId]: {
          ...appData,
          [key]: value,
          credentialId,
          appCategories,
        },
      });
    };
  };

  return { getAppDataGetter, getAppDataSetter, eventTypeFormMetadata };
};

export default useAppsData;
