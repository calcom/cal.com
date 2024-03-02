"use client";

import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "../[type]";

export { default, type PageProps } from "../[type]";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
