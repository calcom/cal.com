"use client";

import { DataTableProvider } from "@calcom/features/data-table/DataTableProvider";
import MembersView from "@calcom/features/ee/organizations/pages/members";
import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const ACTIONS_CONTAINER_CLASS_NAME = "org_members_header_cta";

const MembersPage: React.FC = () => {
  const { t } = useLocale();
  return (
    <DataTableProvider defaultPageSize={25} toolbarContainerClassName={ACTIONS_CONTAINER_CLASS_NAME}>
      <Shell
        withoutMain={false}
        title={t("organization_members")}
        description={t("organization_description")}
        withoutSeo
        heading={t("organization_members")}
        subtitle={t("organization_description")}
        actions={<div className={ACTIONS_CONTAINER_CLASS_NAME} />}>
        <MembersView />
      </Shell>
    </DataTableProvider>
  );
};

export default MembersPage;
