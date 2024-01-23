"use client";

import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import Apps from "@components/pages/apps/categories";

Apps.PageWrapper = PageWrapper;

export { getServerSideProps };
