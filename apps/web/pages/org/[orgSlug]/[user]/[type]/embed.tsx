import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../[type]";

export { default } from "../[type]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
