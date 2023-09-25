import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../[user]/profile";

export { default } from "../[user]/profile";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
