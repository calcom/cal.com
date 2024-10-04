import type { TDependencyData } from "@calcom/app-store/_appRegistry";
import { getAppFromSlug } from "@calcom/app-store/utils";

import type { EnabledApp } from "./getEnabledAppsFromCredentials";

const getAppDependencyData = (enabledApps: EnabledApp[], dependencies?: string[] | undefined) => {
  let dependencyData: TDependencyData = [];
  if (dependencies?.length) {
    dependencyData = dependencies.map((dependency) => {
      const dependencyInstalled = enabledApps.some(
        (dbAppIterator) => dbAppIterator.credentials.length && dbAppIterator.slug === dependency
      );
      // If the app marked as dependency is simply deleted from the codebase, we can have the situation where App is marked installed in DB but we couldn't get the app.
      const dependencyName = getAppFromSlug(dependency)?.name;
      return { name: dependencyName, installed: dependencyInstalled };
    });
  }

  return dependencyData;
};

export default getAppDependencyData;
