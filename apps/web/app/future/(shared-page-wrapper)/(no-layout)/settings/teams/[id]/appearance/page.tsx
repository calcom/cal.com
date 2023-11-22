import Page from "@pages/settings/teams/[id]/appearance";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description")
  );

export default Page;
