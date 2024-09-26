import { getLayout as getSettingsLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { HorizontalTabs } from "@calcom/ui";

export default function OrgMigrationLayout({ children }: { children: React.ReactElement }) {
  return getSettingsLayout(
    <div>
      <HorizontalTabs
        tabs={[
          {
            name: "Move Team to Org",
            href: "/settings/admin/orgMigrations/moveTeamToOrg",
          },
          {
            name: "Move User to Org",
            href: "/settings/admin/orgMigrations/moveUserToOrg",
          },
          {
            name: "Revert: Move Team to Org",
            href: "/settings/admin/orgMigrations/removeTeamFromOrg",
          },
          {
            name: "Revert: Move User to Org",
            href: "/settings/admin/orgMigrations/removeUserFromOrg",
          },
        ]}
      />
      {children}
    </div>
  );
}
export const getLayout = (page: React.ReactElement) => {
  return <OrgMigrationLayout>{page}</OrgMigrationLayout>;
};
