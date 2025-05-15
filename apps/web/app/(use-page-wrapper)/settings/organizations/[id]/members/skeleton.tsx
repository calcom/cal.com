"use client";

import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import Shell from "@calcom/features/shell/Shell";
import { UserListTableSkeleton } from "@calcom/features/users/components/UserTable/UserListTableSkeleton";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export function MembersPageLoader() {
  const { t } = useLocale();

  return (
    <Shell
      withoutMain={false}
      title={t("organization_members")}
      description={t("organization_description")}
      heading={t("organization_members")}
      subtitle={t("organization_description")}
      headerClassName="hidden md:block"
      actions={<div className={`mb-2 ${CTA_CONTAINER_CLASS_NAME}`} />}>
      <UserListTableSkeleton />
    </Shell>
  );
}
