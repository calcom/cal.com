import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import LegacyPage from "~/upgrade/upgrade-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Your upgrade is here",
    () => "Improve your scheduling experience by upgrading to the new plan and enjoy the new features."
  );

export default WithLayout({ getLayout: null, Page: LegacyPage })<"P">;
