import { AppSettingsComponentsMap } from "@calcom/app-store/apps.browser.generated";

import { DynamicComponent } from "./DynamicComponent";

export const AppSettings = (props: { slug: string; credentialId: number }) => {
  return (
    <DynamicComponent<typeof AppSettingsComponentsMap>
      wrapperClassName="border-t border-subtle p-6"
      componentMap={AppSettingsComponentsMap}
      {...props}
    />
  );
};
