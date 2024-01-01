import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../[user]";

export { default } from "../[user]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
