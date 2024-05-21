import { appSettingsOptions } from "@calcom/app-store/templates/audit-log-implementation/constants";
import { VerticalTabs } from "@calcom/ui";

export const NavigationPanel = () => {
  return (
    <>
      <div className="block">
        <VerticalTabs
          tabs={appSettingsOptions}
          sticky
          linkShallow
          // itemClassname={classNames?.verticalTabsItem}
        />
      </div>
    </>
  );
};
