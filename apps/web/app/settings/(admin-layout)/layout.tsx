import { WithLayout } from "app/layoutHOC";

import { getLayout } from "./AdminLayoutAppDir";

export default WithLayout({ getServerLayout: getLayout })<"L">;
