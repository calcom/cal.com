import { appSettingsOptions } from "templates/audit-log-implementation/constants";

import { HorizontalTabs, VerticalTabs } from "@calcom/ui";

export const NavigationPanel = () => {
  return (
    <>
      <div className="hidden xl:block">
        <VerticalTabs
          tabs={appSettingsOptions}
          sticky
          linkShallow
          // itemClassname={classNames?.verticalTabsItem}
        />
      </div>
      <div className="block overflow-x-scroll xl:hidden">
        <HorizontalTabs tabs={appSettingsOptions} linkShallow />
      </div>
    </>
  );
};
