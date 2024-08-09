import { getLayout } from "@pages/settings/admin/orgMigrations/_OrgMigrationLayout";
import MoveUserToOrg from "@pages/settings/admin/orgMigrations/moveUserToOrg";
import { getServerSideProps } from "@pages/settings/admin/orgMigrations/moveUserToOrg";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Organization Migration: Move a user",
    () =>
      "Migrates a user to an organization along with the user's teams. But the teams' users are not migrated"
  );
};

export default WithLayout({
  getData: withAppDirSsr(getServerSideProps),
  Page: MoveUserToOrg,
  getLayout,
})<"P">;
