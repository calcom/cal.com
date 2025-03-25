"use client";

import { TOOLBAR_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import MembersView from "@calcom/features/ee/organizations/pages/members";
import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const MembersPage: React.FC = () => {
  const { t } = useLocale();
  return (
    <Shell
      withoutMain={false}
      title={t("organization_members")}
      description={t("organization_description")}
      withoutSeo
      heading={t("organization_members")}
      subtitle={t("organization_description")}
      headerClassName="hidden md:block"
      actions={<div className={`mb-2 ${TOOLBAR_CONTAINER_CLASS_NAME}`} />}>
      <MembersView />
    </Shell>
  );
};

export default MembersPage;
