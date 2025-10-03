import { type Params } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { AdminTeamEditPage } from "@calcom/features/teams/pages/admin/AdminTeamEditPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { prisma } from "@calcom/prisma";
import { adminFindTeamById } from "@calcom/trpc/server/routers/viewer/teams/adminUtils";

const teamIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: { params: Params }) => {
  const input = teamIdSchema.safeParse(await params);
  if (!input.success) {
    return await _generateMetadata(
      (t) => t("editing_team"),
      (t) => t("admin_teams_edit_description"),
      undefined,
      undefined,
      "/settings/admin/teams/edit"
    );
  }

  const team = await adminFindTeamById(prisma, input.data.id);

  return await _generateMetadata(
    (t) => `${t("editing_team")}: ${team.name}`,
    (t) => t("admin_teams_edit_description"),
    undefined,
    undefined,
    `/settings/admin/teams/${input.data.id}/edit`
  );
};

const Page = async ({ params }: { params: Params }) => {
  const input = teamIdSchema.safeParse(await params);

  if (!input.success) throw new Error("Invalid access");

  const team = await adminFindTeamById(prisma, input.data.id);
  const t = await getTranslate();

  return (
    <SettingsHeader title={`${t("editing_team")}: ${team.name}`} description={t("admin_teams_edit_description")}>
      <LicenseRequired>
        <AdminTeamEditPage team={team} />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
