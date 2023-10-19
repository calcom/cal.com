import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../[uid]";

export { default } from "../[uid]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
