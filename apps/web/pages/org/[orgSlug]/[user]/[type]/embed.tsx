"use client";

import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from ".";

export { default, type PageProps } from ".";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
