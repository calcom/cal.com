import { AppSettingsComponentsMap } from "@calcom/app-store/apps.browser.generated";

import { DynamicComponent } from "./DynamicComponent";

export const AppSettings = (props: { slug: string }) => {
  return (
    <DynamicComponent<typeof AppSettingsComponentsMap>
      wrapperClassName="border-t border-gray-200 bg-gray-100"
      componentMap={AppSettingsComponentsMap}
      {...props}
    />
  );
};
