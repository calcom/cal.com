import { useLocale } from "@calcom/lib/hooks/useLocale";

import Shell from "~/shell/Shell";

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
        <>
          <AppPage {...props} />
        </>
      ) : (
        <AppPage {...props} />
      )}
    </Shell>
  );
}
