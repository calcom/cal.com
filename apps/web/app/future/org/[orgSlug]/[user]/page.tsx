import Page from "@pages/org/[orgSlug]/[user]";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";

const getData = withAppDir(getServerSideProps);

// @ts-expect-error Type '(context: ReturnType<typeof buildLegacyCtx>) => Promise<{ [key: string]: any; }>' is not assignable to type '(arg: { query: Params; params: Params; req: { headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }; }) => Promise<Props>'
export default WithLayout({ getLayout: null, getData, isBookingPage: true, Page });
