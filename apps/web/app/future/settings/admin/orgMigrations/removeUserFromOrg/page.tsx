import { getLayout } from "@pages/settings/admin/orgMigrations/_OrgMigrationLayout";
import RemoveUserFromOrg from "@pages/settings/admin/orgMigrations/removeUserFromOrg";
import { getServerSideProps } from "@pages/settings/admin/orgMigrations/removeUserFromOrg";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Organization Migration: Revert a user",
    () => "Reverts a migration of a user to an organization"
  );
};

export default WithLayout({
  getData: withAppDirSsr(getServerSideProps),
  Page: RemoveUserFromOrg,
  getLayout,
})<"P">;
