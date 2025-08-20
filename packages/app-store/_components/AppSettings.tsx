import { getAppSettingsComponentsMap } from "@calcom/lib/apps/registry";

import { AsyncDynamicComponent } from "./AsyncDynamicComponent";

export const AppSettings = (props: { slug: string }) => {
  return (
    <AsyncDynamicComponent
      wrapperClassName="border-t border-subtle p-6"
      componentMapPromise={getAppSettingsComponentsMap()}
      {...props}
    />
  );
};
