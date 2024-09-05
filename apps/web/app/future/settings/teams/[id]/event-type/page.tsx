import LegacyPage, { GetLayout } from "@pages/settings/teams/[id]/event-type";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_new_team_event_type"),
    (t) => t("new_event_type_to_book_description")
  );

export default WithLayout({ Page: LegacyPage, getLayout: GetLayout })<"P">;
