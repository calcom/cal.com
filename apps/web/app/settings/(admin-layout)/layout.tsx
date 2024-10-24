import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@components/auth/layouts/AdminLayoutAppDir";

export default WithLayout({ getServerLayout: getLayout })<"L">;
