import { useTranslation } from "react-i18next";

import Shell from "@calcom/features/shell/Shell";

import { AppPage, type AppPageProps } from "./AppPage";

const ShellHeading = () => {
  const { t } = useTranslation("apps");
  return <span className="block py-2">{t("app_store")}</span>;
};

export default function WrappedApp(props: AppPageProps) {
  const { t } = useTranslation("apps");
  return (
    <Shell smallHeading isPublic heading={<ShellHeading />} backPath="/apps">
      <AppPage {...props} />
    </Shell>
  );
}
