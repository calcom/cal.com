import { WithLayout } from "app/layoutHOC";

import ConnectAndJoin from "@components/pages/connect-and-join";

export default WithLayout({ getLayout: null, Page: ConnectAndJoin })<"P">;
