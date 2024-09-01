"use client";

import { getServerSideProps as _getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

export { default } from "~/team/type-view";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
