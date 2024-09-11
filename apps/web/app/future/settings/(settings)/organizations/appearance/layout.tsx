import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/settings/appDir/SettingsLayoutAppDir";

export default WithLayout({ getServerLayout: getLayout });
