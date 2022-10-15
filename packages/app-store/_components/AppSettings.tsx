import { AppSettingsComponentsMap } from "@calcom/app-store/apps.browser.generated";

import { DynamicComponent } from "./DynamicComponent";

export const AppSettings = (props: { slug: string }) => {
  return (
    <DynamicComponent<typeof AppSettingsComponentsMap> componentMap={AppSettingsComponentsMap} {...props} />
  );
};
