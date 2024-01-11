"use client";

import { getServerSideProps as _getServerSideProps } from "@lib/booking/[uid]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

export { default } from "../[uid]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
