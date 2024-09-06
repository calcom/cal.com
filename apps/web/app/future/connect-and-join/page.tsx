import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import LegacyPage from "~/connect-and-join/connect-and-join-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("instant_tab_title"),
    (t) => t("uprade_to_create_instant_bookings")
  );
};

export default WithLayout({ getLayout: null, Page: LegacyPage })<"P">;
