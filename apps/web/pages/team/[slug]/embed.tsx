"use client";

import { getServerSideProps as _getServerSideProps } from "@lib/team/[slug]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

export { default } from "~/team/team-view";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
