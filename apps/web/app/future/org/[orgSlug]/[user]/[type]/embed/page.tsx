import Page, { getServerSideProps } from "@pages/org/[orgSlug]/[user]/[type]/embed";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

const getData = withAppDir(getServerSideProps);

// @ts-expect-error Type '(context: ReturnType<typeof buildLegacyCtx>) => Promise<{ [key: string]: any; }>' is not assignable to type '(arg: { query: Params; params: Params; req: { headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }; }) => Promise<Props>'.
export default WithLayout({ getLayout: null, getData, isBookingPage: true, Page });
