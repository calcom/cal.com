import { getLayout } from "@pages/settings/admin/orgMigrations/_OrgMigrationLayout";
import RemoveTeamFromOrg from "@pages/settings/admin/orgMigrations/removeTeamFromOrg";
import { getServerSideProps } from "@pages/settings/admin/orgMigrations/removeTeamFromOrg";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Organization Migration: Revert a team",
    () => "Reverts a migration of a team to an organization"
  );
};

export default WithLayout({
  getData: withAppDirSsr(getServerSideProps),
  Page: RemoveTeamFromOrg,
  getLayout,
})<"P">;
