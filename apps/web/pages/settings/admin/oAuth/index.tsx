"use client";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

import OAuthView from "./oAuthView";

const OAuthPage = () => <OAuthView />;

OAuthPage.getLayout = getLayout;
OAuthPage.PageWrapper = PageWrapper;

export default OAuthPage;
