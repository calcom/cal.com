import { WithLayout } from "app/layoutHOC";

import LegacyPage from "~/connect-and-join/connect-and-join-view";

export default WithLayout({ getLayout: null, Page: LegacyPage })<"P">;
