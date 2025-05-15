import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { UserListTableSkeleton } from "@calcom/features/users/components/UserTable/UserListTableSkeleton";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export function MembersPageLoader() {
  const { t } = useLocale();

  return (
    <SettingsHeader
      title={t("organization_members")}
      description={t("organization_description")}
      ctaClassName={CTA_CONTAINER_CLASS_NAME}>
      <UserListTableSkeleton />
    </SettingsHeader>
  );
}
