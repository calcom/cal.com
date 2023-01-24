import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from ".";

export { default } from ".";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
