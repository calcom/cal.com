import { getLayout } from "@pages/settings/admin/orgMigrations/_OrgMigrationLayout";
import MoveTeamToOrg from "@pages/settings/admin/orgMigrations/moveTeamToOrg";
import { getServerSideProps } from "@pages/settings/admin/orgMigrations/moveTeamToOrg";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Organization Migration: Move a team",
    () => "Migrates a team to an organization"
  );
};

export default WithLayout({
  getData: withAppDirSsr(getServerSideProps),
  Page: MoveTeamToOrg,
  getLayout,
})<"P">;
