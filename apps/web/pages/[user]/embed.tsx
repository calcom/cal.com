import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "@server/lib/[user]/getServerSideProps";

export { default } from "./index";
export const getServerSideProps = withEmbedSsr(_getServerSideProps);
