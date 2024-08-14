import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import PasswordViewWrapper from "~/settings/security/password-view";

PasswordViewWrapper.getLayout = getLayout;
PasswordViewWrapper.PageWrapper = PageWrapper;

export default PasswordViewWrapper;
