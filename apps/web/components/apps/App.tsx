import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { AppPageProps } from "./AppPage";
import { AppPage } from "./AppPage";

const ShellHeading = () => {
  const { t } = useLocale();
  return <span className="block py-2">{t("app_store")}</span>;
};

export default function WrappedApp(props: AppPageProps) {
  return (
    <Shell smallHeading isPublic heading={<ShellHeading />} backPath="/apps">
      {props.licenseRequired ? (
        <LicenseRequired>
          <AppPage {...props} />
        </LicenseRequired>
      ) : (
        <AppPage {...props} />
      )}
    </Shell>
  );
}
