import { WithLayout } from "app/layoutHOC";

import { getInsightsLayout } from "~/insights/layout";

export default WithLayout({ getLayout: getInsightsLayout });
