import { WithLayout } from "app/layoutHOC";

import { getLayout } from "./SettingsLayoutAppDir";

export default WithLayout({ getServerLayout: getLayout })<"L">;
