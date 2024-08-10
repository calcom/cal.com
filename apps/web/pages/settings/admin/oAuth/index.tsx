"use client";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

import OAuthView from "~/settings/admin/oauth/oauth-view";

const OAuthPage = () => <OAuthView />;

OAuthPage.getLayout = getLayout;
OAuthPage.PageWrapper = PageWrapper;

export default OAuthPage;
