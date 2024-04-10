import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/ee/teams/pages/team-appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description")
  );

export default Page;
