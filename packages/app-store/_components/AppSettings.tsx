import { getAppSettingsComponentsMap } from "@calcom/lib/apps/registry";

import { DynamicComponent } from "./DynamicComponent";

export const AppSettings = (props: { slug: string }) => {
  return (
    <DynamicComponent
      wrapperClassName="border-t border-subtle p-6"
      componentMap={getAppSettingsComponentsMap()}
      {...props}
    />
  );
};
