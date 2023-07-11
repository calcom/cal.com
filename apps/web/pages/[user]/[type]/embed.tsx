import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../[type]";

export { default } from "../[type]";

// Somehow these types don't accept the {notFound: true} return type.
// Probably still need to fix this. I don't know why this isn't allowed yet.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const getServerSideProps = withEmbedSsr(_getServerSideProps);
