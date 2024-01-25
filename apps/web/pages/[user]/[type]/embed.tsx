import { getServerSideProps as _getServerSideProps } from "@lib/[user]/[type]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

export { default } from "../[type]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
