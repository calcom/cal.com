"use client";

import { getServerSideProps } from "@lib/d/[link]/[slug]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import Type from "@components/pages/d/[link]/[slug]";

Type.PageWrapper = PageWrapper;
Type.isBookingPage = true;

export default Type;

export { getServerSideProps };
