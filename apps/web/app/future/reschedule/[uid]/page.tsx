import OldPage, { getServerSideProps } from "@pages/reschedule/[uid]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page: OldPage });
