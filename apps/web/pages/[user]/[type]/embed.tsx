import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);

export { default } from "./index";
