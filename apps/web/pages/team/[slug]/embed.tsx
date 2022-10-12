import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../[slug]";

export { default } from "../[slug]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
