import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

const MembersView = () => {
  const { t } = useLocale();

  return (
    <LicenseRequired>
      <Meta
        title={t("organization_members")}
        description={t("organization_description")}
        borderInShellHeader
      />
      <div className="border-subtle rounded-lg rounded-t-none border border-t-0 px-6 py-8">
        <UserListTable />
      </div>
    </LicenseRequired>
  );
};
MembersView.getLayout = getLayout;

export default MembersView;
