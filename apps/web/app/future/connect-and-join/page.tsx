import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import LegacyPage from "~/connect-and-join/connect-and-join-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Connect and Join",
    () => ""
  );
};

export default WithLayout({ getLayout: null, Page: LegacyPage })<"P">;
